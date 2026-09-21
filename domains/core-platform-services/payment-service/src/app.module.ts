import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PaymentController } from './payment.controller';
import { HealthController } from './health.controller';
import { TransactionService } from './transactions/transaction.service';
import { ChapaService } from './gateways/chapa.service';
import { StripeService } from './gateways/stripe.service';
import { ChapaWebhookController } from './webhooks/chapa-webhook.controller';
import { StripeWebhookController } from './webhooks/stripe-webhook.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: 'payment_events_queue',
            queueOptions: {
              durable: true,
            },
            // Use exchange for broadcasting
            exchange: 'payment_events',
            exchangeType: 'fanout',
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [
    PaymentController,
    HealthController,
    ChapaWebhookController,
    StripeWebhookController,
  ],
  providers: [
    TransactionService,
    ChapaService,
    StripeService,
  ],
})
export class AppModule {}
