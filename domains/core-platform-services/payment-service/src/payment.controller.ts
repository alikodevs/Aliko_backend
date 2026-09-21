import { Controller, Post, Body, BadRequestException, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TransactionService } from './transactions/transaction.service';
import { ChapaService } from './gateways/chapa.service';
import { StripeService } from './gateways/stripe.service';
import { InitializePaymentDto } from './common/dto/initialize-payment.dto';
import { PaymentProvider } from './generated/client';
import { resolvePaymentConfig } from './common/utils/geo-resolver';
import { randomUUID } from 'crypto';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly chapaService: ChapaService,
    private readonly stripeService: StripeService,
  ) {}

  @MessagePattern({ cmd: 'resolve_payment_config' })
  async resolveConfig(
    @Payload() data: { clientIp?: string; clientCountry?: string; provider?: string; currency?: string },
  ) {
    // Lets callers resolve provider & currency (via IP geolocation) before they
    // compute an amount, so the amount they send matches the resolved currency.
    return resolvePaymentConfig(data.clientIp, data.clientCountry, data.provider, data.currency);
  }

  @MessagePattern({ cmd: 'initialize_payment' })
  async initialize(
    @Payload() data: InitializePaymentDto & { userId?: string; clientIp?: string; clientCountry?: string },
  ) {
    // Geo-routing: resolve provider & currency from IP/country/explicit values
    const geoConfig = await resolvePaymentConfig(
      data.clientIp,
      data.clientCountry,
      data.provider,
      data.currency,
    );
    const provider = geoConfig.provider as PaymentProvider;
    const currency = geoConfig.currency;

    this.logger.log(
      `Initializing payment for ${data.email} via ${provider} (${currency}) [Client IP: ${data.clientIp || 'N/A'}, Country: ${data.clientCountry || 'N/A'}]`,
    );

    try {
      const reference = randomUUID();
      this.logger.log(`Generated reference: ${reference}`);
      
      // 1. Persist transaction
      this.logger.log(`Persisting transaction to DB...`);
      await this.transactionService.createTransaction({
        amount: data.amount,
        currency,
        provider,
        reference,
        userId: data.userId,
        purpose: data.purpose,
        metadata: data.metadata,
      });
      this.logger.log(`Transaction persisted.`);

      // 2. Call gateway
      const gatewayPayload = {
        ...data,
        currency,
        reference,
      };

      let response;
      if (provider === PaymentProvider.CHAPA) {
        this.logger.log(`Calling Chapa gateway...`);
        response = await this.chapaService.initializeTransaction(gatewayPayload);
        this.logger.log(`Chapa response received.`);
      } else if (provider === PaymentProvider.STRIPE) {
        this.logger.log(`Calling Stripe gateway...`);
        response = await this.stripeService.initializeTransaction(gatewayPayload);
        this.logger.log(`Stripe response received.`);
      } else {
        throw new BadRequestException('Unsupported payment provider');
      }

      // 3. Update provider reference if needed
      if (response.providerReference) {
          this.logger.log(`Updating provider reference: ${response.providerReference}`);
          await this.transactionService.updateProviderReference(reference, response.providerReference);
          this.logger.log(`Provider reference updated.`);
      }

      return {
        reference,
        checkoutUrl: response.checkoutUrl,
      };
    } catch (error) {
      this.logger.error(`Payment initialization failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_user_transactions' })
  async getUserTransactions(@Payload() payload: { userId: string }) {
    this.logger.log(`Fetching transactions for user ${payload.userId}`);
    return this.transactionService.getUserTransactions(payload.userId);
  }

  @MessagePattern({ cmd: 'get_all_transactions' })
  async getAllTransactions() {
    this.logger.log('Fetching all transactions (Admin)');
    return this.transactionService.getAllTransactions();
  }

  @MessagePattern({ cmd: 'update_transaction_status' })
  async updateTransactionStatus(@Payload() payload: { id: number; status: string }) {
    this.logger.log(`Updating transaction ${payload.id} status to ${payload.status}`);
    return this.transactionService.updateTransactionStatus(payload.id, payload.status);
  }
}
