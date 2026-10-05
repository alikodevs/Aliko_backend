import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EnrollmentsService } from './enrollments.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class PaymentFulfillmentListener {
  private readonly logger = new Logger(PaymentFulfillmentListener.name);

  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    private readonly prisma: PrismaService,
  ) {}

  @EventPattern('payment.succeeded')
  async handlePaymentSuccess(@Payload() data: any) {
    this.logger.log(`Received payment.succeeded event: ${JSON.stringify(data)}`);

    const { userId, amount, purpose, metadata } = data;

    if (purpose === 'COURSE_PURCHASE' || (metadata && metadata.courseId)) {
      const courseId = metadata.courseId || parseInt(purpose.split('_').pop());
      
      this.logger.log(`Processing course fulfillment for user ${userId}, course ${courseId}`);

      try {
        // Find the pending enrollment
        const enrollment = await this.prisma.enrollment.findFirst({
          where: {
            userId: userId,
            courseId: courseId,
            paymentStatus: 'PENDING',
          },
        });

        if (!enrollment) {
          this.logger.warn(`No pending enrollment found for user ${userId} and course ${courseId}. It might have been already processed or doesn't exist.`);
          return;
        }

        // Update enrollment status
        await this.prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            paymentStatus: 'COMPLETED',
            status: 'ACTIVE',
          },
        });

        this.logger.log(`Successfully fulfilled course ${courseId} for user ${userId}`);
      } catch (error) {
        this.logger.error(`Failed to fulfill course enrollment: ${error.message}`, error.stack);
      }
    } else {
      this.logger.log(`Event ignored: Purpose '${purpose}' is not a course purchase.`);
    }
  }
}
