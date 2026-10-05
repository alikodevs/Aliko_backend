import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StripeService } from '../gateways/stripe.service';
import { TransactionService } from '../transactions/transaction.service';

@Controller()
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly transactionService: TransactionService,
  ) {}

  @MessagePattern({ cmd: 'webhook_stripe' })
  async handleWebhook(@Payload() payload: any) {
    const { data, signature } = payload;
    this.logger.log(`Processing Stripe webhook. Signature: ${signature ? 'present' : 'missing'}`);
    
    let rawData = data;
    if (data && data.type === 'Buffer') {
        rawData = Buffer.from(data.data);
        this.logger.log('Converted Stripe payload from Buffer object');
    } else if (typeof data === 'string' || Buffer.isBuffer(data)) {
        this.logger.log(`Stripe payload is ${typeof data === 'string' ? 'string' : 'Buffer'}`);
    } else {
        this.logger.log(`Stripe payload type: ${typeof data}. Keys: ${Object.keys(data || {})}`);
        rawData = JSON.stringify(data);
    }

    const verification = await this.stripeService.verifyWebhook(rawData, signature);

    if (verification.isValid) {
      this.logger.log(`Stripe webhook verified. Event status: ${verification.status}, Provider ref: ${verification.providerReference}`);

      switch (verification.status) {
        case 'COMPLETED':
          await this.transactionService.handleWebhookSuccess(verification.providerReference, verification.amount);
          this.logger.log(`Payment completed for session: ${verification.providerReference}`);
          break;

        case 'FAILED':
        case 'CANCELLED':
          await this.transactionService.handleWebhookFailure(verification.providerReference);
          this.logger.warn(`Payment ${verification.status.toLowerCase()} for session: ${verification.providerReference}`);
          break;

        case 'REFUNDED':
          this.logger.log(`Payment refunded for charge: ${verification.providerReference}`);
          // Refunds are handled via status update — the providerReference here is the charge ID
          await this.transactionService.handleWebhookFailure(verification.providerReference);
          break;

        case 'PENDING':
          this.logger.log(`Unhandled but valid Stripe event received`);
          break;

        default:
          this.logger.log(`Unknown verification status: ${verification.status}`);
      }

      return { received: true };
    }

    this.logger.warn('Stripe webhook signature verification failed');
    return { received: false, error: 'Invalid signature' };
  }
}
