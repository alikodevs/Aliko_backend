import { Module } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentGuard } from './enrollment.guard';
import { PaymentFulfillmentListener } from './payment-fulfillment.listener';
import { ClientsModule } from '@nestjs/microservices';
import { createPaymentClientAsync } from '@alikohub/payment-client';

@Module({
  imports: [ClientsModule.registerAsync([createPaymentClientAsync()])],
  controllers: [EnrollmentsController, PaymentFulfillmentListener],
  providers: [EnrollmentsService, PrismaService, EnrollmentGuard],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
