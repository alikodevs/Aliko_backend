import { Transport, RmqOptions } from '@nestjs/microservices';

export type FanoutQueueOptions = {
  urls?: string[];
  queue: string;
  exchange: string;
  durable?: boolean;
};

/** Nest RMQ fanout microservice options used across domain backends. */
export function createFanoutMicroserviceOptions(
  options: FanoutQueueOptions,
): RmqOptions {
  const urls = options.urls || [
    process.env.RABBITMQ_URL || 'amqp://localhost',
  ];
  return {
    transport: Transport.RMQ,
    options: {
      urls,
      queue: options.queue,
      exchange: options.exchange,
      exchangeType: 'fanout',
      queueOptions: {
        durable: options.durable ?? false,
      },
    },
  };
}
