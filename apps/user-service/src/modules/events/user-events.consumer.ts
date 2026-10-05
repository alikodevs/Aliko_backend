import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventBusService } from '@aliko/event-bus';

@Injectable()
export class UserEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(UserEventsConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService
  ) {}

  onModuleInit() {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    this.eventBus.subscribeIdempotent(
      'payment.completed',
      'user-service-payment-consumer',
      this.prisma,
      async (data: any) => {
        this.logger.log(`Handling payment.completed in user-service for user: ${data.userId}`);
      }
    );
  }
}
