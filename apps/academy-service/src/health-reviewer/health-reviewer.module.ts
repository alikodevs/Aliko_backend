import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { HealthReviewerController } from './health-reviewer.controller';
import { HealthReviewerService } from './health-reviewer.service';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [HealthReviewerController],
  providers: [HealthReviewerService],
  exports: [HealthReviewerService],
})
export class HealthReviewerModule {}
