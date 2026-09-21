import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import {
  PAYMENT_EVENTS_EXCHANGE,
  PAYMENT_MESSAGE_PATTERNS,
  PAYMENT_SERVICE,
  createPaymentClientAsync,
} from './index';

describe('@alikohub/payment-client', () => {
  it('exports stable payment constants', () => {
    expect(PAYMENT_SERVICE).toBe('PAYMENT_SERVICE');
    expect(PAYMENT_EVENTS_EXCHANGE).toBe('payment_events');
    expect(PAYMENT_MESSAGE_PATTERNS.CREATE_CHECKOUT).toBe('create_checkout');
    expect(PAYMENT_MESSAGE_PATTERNS.WEBHOOK_CHAPA).toBe('webhook_chapa');
  });

  it('createPaymentClientAsync defaults to localhost:3012', () => {
    const entry = createPaymentClientAsync();
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const options = entry.useFactory(config);
    expect(options.transport).toBe(Transport.TCP);
    expect(options.options.host).toBe('localhost');
    expect(options.options.port).toBe(3012);
  });

  it('createPaymentClientAsync reads payment host/port from config', () => {
    const entry = createPaymentClientAsync();
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PAYMENT_SERVICE_HOST') return 'payment-service';
        if (key === 'PAYMENT_SERVICE_PORT') return '3012';
        return undefined;
      }),
    } as unknown as ConfigService;

    const options = entry.useFactory(config);
    expect(options.options.host).toBe('payment-service');
    expect(options.options.port).toBe(3012);
  });
});
