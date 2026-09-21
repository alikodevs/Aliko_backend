import { Transport } from '@nestjs/microservices';
import { createFanoutMicroserviceOptions } from './connect';

describe('@alikohub/rabbitmq createFanoutMicroserviceOptions', () => {
  const original = process.env.RABBITMQ_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.RABBITMQ_URL;
    else process.env.RABBITMQ_URL = original;
  });

  it('builds RMQ fanout options with defaults', () => {
    delete process.env.RABBITMQ_URL;
    const opts = createFanoutMicroserviceOptions({
      queue: 'academy_user_events',
      exchange: 'user_events',
    });

    expect(opts.transport).toBe(Transport.RMQ);
    expect(opts.options?.queue).toBe('academy_user_events');
    expect((opts.options as any).exchange).toBe('user_events');
    expect((opts.options as any).exchangeType).toBe('fanout');
    expect(opts.options?.queueOptions?.durable).toBe(false);
    expect(opts.options?.urls).toEqual(['amqp://localhost']);
  });

  it('honors durable flag and custom urls', () => {
    const opts = createFanoutMicroserviceOptions({
      urls: ['amqp://user:pass@rabbitmq:5672'],
      queue: 'academy_payment_fulfillment',
      exchange: 'payment_events',
      durable: true,
    });

    expect(opts.options?.urls).toEqual(['amqp://user:pass@rabbitmq:5672']);
    expect(opts.options?.queueOptions?.durable).toBe(true);
  });
});
