import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient, TransactionStatus, PaymentProvider } from '../generated/client';
import { ClientProxy } from '@nestjs/microservices';
import { connect, AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';

@Injectable()
export class TransactionService implements OnModuleInit {
  private readonly logger = new Logger(TransactionService.name);
  private readonly prisma = new PrismaClient();
  private rabbitmqConn: AmqpConnectionManager;
  private rabbitmqChannel: ChannelWrapper;

  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {}

  async onModuleInit() {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
    this.logger.log(`Connecting to RabbitMQ at ${rabbitmqUrl} for exchange publishing...`);
    try {
      this.rabbitmqConn = connect([rabbitmqUrl]);
      this.rabbitmqChannel = this.rabbitmqConn.createChannel({ json: true });
      this.rabbitmqConn.on('connect', () => {
        this.logger.log('TransactionService RabbitMQ Connected');
      });
    } catch (e) {
      this.logger.warn('TransactionService RabbitMQ connection failed', e);
    }
  }

  private publishPaymentSucceeded(updated: any) {
    // NestJS RMQ @EventPattern expects: { pattern, data } in the message body
    // AND the pattern string in the message properties (via the 'x-pattern' or pattern property)
    const payload = {
      transactionId: updated.id,
      reference: updated.reference,
      userId: updated.userId,
      amount: updated.amount,
      currency: updated.currency,
      purpose: updated.purpose,
      metadata: updated.metadata,
    };

    if (!this.rabbitmqChannel) {
      this.logger.error('RabbitMQ channel not initialized');
      return;
    }

    this.rabbitmqChannel.assertExchange('payment_events', 'fanout', { durable: true })
      .then(() => {
        this.logger.log(`Publishing payment.succeeded to payment_events exchange for reference: ${updated.reference}`);
        // NestJS RMQ server reads pattern from msg.content parsed as JSON.
        // Pass the object directly — json:true channel serializes it correctly.
        const nestMsg = { pattern: 'payment.succeeded', data: payload };
        return (this.rabbitmqChannel as any).publish(
          'payment_events',
          '',
          nestMsg,
          { headers: { pattern: 'payment.succeeded' } },
        );
      })
      .catch(err => {
        this.logger.error(`Failed to publish payment.succeeded event: ${err.message}`);
      });
  }

  async createTransaction(data: {
    amount: number;
    currency: string;
    provider: PaymentProvider;
    reference: string;
    userId?: string;
    purpose?: string;
    metadata?: any;
  }) {
    return this.prisma.transaction.create({
      data: {
        amount: data.amount,
        currency: data.currency,
        provider: data.provider,
        reference: data.reference,
        userId: data.userId,
        purpose: data.purpose,
        metadata: data.metadata,
        status: 'PENDING',
      },
    });
  }

  async updateProviderReference(reference: string, providerReference: string) {
    return this.prisma.transaction.update({
      where: { reference },
      data: { providerReference },
    });
  }

  async handleWebhookSuccess(providerReference: string, amount: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { providerReference },
    });

    if (!transaction) {
      this.logger.error(`Transaction not found for provider reference: ${providerReference}`);
      return;
    }

    if (transaction.status === 'COMPLETED') {
        this.logger.warn(`Transaction ${transaction.reference} already completed.`);
        return;
    }

    // Amount validation (sanity check)
    if (transaction.amount !== amount) {
        this.logger.error(`Amount mismatch for transaction ${transaction.reference}. Expected ${transaction.amount}, got ${amount}`);
        // We might still mark it as completed but flag it, or keep it pending.
        // For now, let's keep it simple.
    }

    const updated = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETED' },
    });

    this.logger.log(`Transaction ${transaction.reference} completed successfully.`);
    this.publishPaymentSucceeded(updated);

    return updated;
  }

  async handleWebhookFailure(providerReference: string) {
      return this.prisma.transaction.updateMany({
          where: { providerReference, status: 'PENDING' },
          data: { status: 'FAILED' }
      });
  }

  async getUserTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllTransactions() {
    return this.prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTransactionStatus(id: number, status: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    const oldStatus = transaction.status;
    const newStatus = status as TransactionStatus;

    if (oldStatus === newStatus) {
      return transaction;
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: { status: newStatus },
    });

    this.logger.log(`Transaction ${id} status updated from ${oldStatus} to ${newStatus}`);

    // If transitioned to COMPLETED and was not COMPLETED before, emit event to RabbitMQ
    if (newStatus === 'COMPLETED' && oldStatus !== 'COMPLETED') {
      this.publishPaymentSucceeded(updated);
    }

    return updated;
  }
}
