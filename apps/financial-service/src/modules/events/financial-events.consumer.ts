import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventBusService } from '@aliko/event-bus';

@Injectable()
export class FinancialEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(FinancialEventsConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService
  ) {}

  onModuleInit() {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    this.eventBus.subscribeIdempotent(
      'course.enrolled',
      'financial-service-course-consumer',
      this.prisma,
      async (data: any) => {
        this.logger.log(`Handling course.enrolled in financial-service: enrollment ${data.enrollmentId || data.id}`);
      }
    );
  }
}
