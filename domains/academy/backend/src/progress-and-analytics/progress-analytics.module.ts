import { Module } from '@nestjs/common';
import { ProgressAndAnalyticsService } from './progress-analytics.service';
import { ProgressAndAnalyticsController } from './progress-analytics.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  controllers: [ProgressAndAnalyticsController],
  providers: [ProgressAndAnalyticsService, PrismaService, NotificationsService],
  exports: [ProgressAndAnalyticsService],
})
export class ProgressAnalyticsModule {}
