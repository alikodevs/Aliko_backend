import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChapaService } from '../gateways/chapa.service';
import { TransactionService } from '../transactions/transaction.service';

@Controller()
export class ChapaWebhookController {
  private readonly logger = new Logger(ChapaWebhookController.name);

  constructor(
    private readonly chapaService: ChapaService,
    private readonly transactionService: TransactionService,
  ) {}

  @MessagePattern({ cmd: 'webhook_chapa' })
  async handleWebhook(@Payload() payload: { data: any, signature: string }) {
    const { data, signature } = payload;
    const ref = data.tx_ref || data.reference;
    this.logger.log(`Received Chapa webhook event for reference: ${ref}`);
    
    // Signature can be 'none' if triggered by a redirect (internal)
    const verification = await this.chapaService.verifyWebhook(data, signature);

    if (verification.isValid) {
      this.logger.log(`Webhook verification SUCCESS for ${ref}. Status: ${verification.status}`);
      if (verification.status === 'COMPLETED') {
        await this.transactionService.handleWebhookSuccess(ref, verification.amount);
      } else {
        await this.transactionService.handleWebhookFailure(ref);
      }
      return { received: true };
    }

    this.logger.warn(`Webhook verification FAILED for ${ref}`);
    return { received: false, error: 'Invalid signature or verification failed' };
  }
}
