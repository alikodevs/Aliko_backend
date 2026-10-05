import { Module } from '@nestjs/common';
import { AppConfigModule } from '@aliko/config';
import { AppLoggerModule } from '@aliko/logger';
import { EventBusModule } from '@aliko/event-bus';
import { PaymentController } from './payment.controller';
import { HealthController } from './health.controller';
import { TransactionService } from './transactions/transaction.service';
import { ChapaService } from './gateways/chapa.service';
import { StripeService } from './gateways/stripe.service';
import { ChapaWebhookController } from './webhooks/chapa-webhook.controller';
import { StripeWebhookController } from './webhooks/stripe-webhook.controller';
import { PrismaService } from './database/prisma.service';
import { FinancialOutboxPublisherWorker } from './modules/events/financial-outbox-publisher.worker';
import { FinancialEventsConsumer } from './modules/events/financial-events.consumer';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    EventBusModule,
  ],
  controllers: [
    PaymentController,
    HealthController,
    ChapaWebhookController,
    StripeWebhookController,
  ],
  providers: [
    PrismaService,
    TransactionService,
    ChapaService,
    StripeService,
    FinancialOutboxPublisherWorker,
    FinancialEventsConsumer,
  ],
  exports: [PrismaService],
})
export class AppModule {}
