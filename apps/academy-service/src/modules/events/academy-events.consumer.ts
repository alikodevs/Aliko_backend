import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventBusService } from '@aliko/event-bus';

@Injectable()
export class AcademyEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(AcademyEventsConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService
  ) {}

  onModuleInit() {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    this.eventBus.subscribeIdempotent(
      'user.registered',
      'academy-service-user-consumer',
      this.prisma,
      async (data: any) => {
        this.logger.log(`Handling user.registered in academy-service for user: ${data.userId || data.id}`);
      }
    );
  }
}
