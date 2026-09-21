import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  connect,
  AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection!: AmqpConnectionManager;
  private channel!: ChannelWrapper;
  private isConnected = false;

  async onModuleInit() {
    try {
      this.connection = connect([
        process.env.RABBITMQ_URL || 'amqp://localhost',
      ]);
      this.channel = this.connection.createChannel({ json: true });
      this.connection.on('connect', () => {
        console.log('RabbitMQ Connected');
        this.isConnected = true;
      });
      this.connection.on('disconnect', (err) => {
        console.log('RabbitMQ Disconnected', err?.err);
        this.isConnected = false;
      });
    } catch (e) {
      console.warn('RabbitMQ connection failed', e);
    }
  }

  async sendToQueue(queue: string, message: unknown) {
    if (!this.channel || !this.isConnected) {
      console.warn(`RabbitMQ not connected, skipping sendToQueue: ${queue}`);
      return;
    }
    try {
      await this.channel.assertQueue(queue, { durable: false });
      await this.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
      );
    } catch (e: any) {
      console.warn('RabbitMQ send failed', e?.message);
    }
  }

  async publishToExchange(exchange: string, message: unknown) {
    if (!this.channel || !this.isConnected) {
      console.warn(
        `RabbitMQ not connected, skipping publishToExchange: ${exchange}`,
      );
      return;
    }
    try {
      await this.channel.assertExchange(exchange, 'fanout', { durable: true });
      await this.channel.publish(
        exchange,
        '',
        Buffer.from(JSON.stringify(message)),
      );
    } catch (e: any) {
      console.warn('RabbitMQ publish failed', e?.message);
    }
  }

  async onModuleDestroy() {
    if (this.connection) {
      await this.connection.close();
    }
  }
}
