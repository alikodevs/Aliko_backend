import { ConfigModule, ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

export const PAYMENT_SERVICE = 'PAYMENT_SERVICE';

export const PAYMENT_MESSAGE_PATTERNS = {
  CREATE_CHECKOUT: 'create_checkout',
  WEBHOOK_CHAPA: 'webhook_chapa',
  WEBHOOK_STRIPE: 'webhook_stripe',
  GET_TRANSACTION: 'get_transaction',
} as const;

export const PAYMENT_EVENTS_EXCHANGE = 'payment_events';

/** Nest ClientsModule.registerAsync entry (loosely typed for Nest 10/11 compatibility). */
export function createPaymentClientAsync(name: string = PAYMENT_SERVICE): any {
  return {
    name,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.TCP,
      options: {
        host: configService.get('PAYMENT_SERVICE_HOST') || 'localhost',
        port: Number(configService.get('PAYMENT_SERVICE_PORT')) || 3012,
      },
    }),
  };
}
