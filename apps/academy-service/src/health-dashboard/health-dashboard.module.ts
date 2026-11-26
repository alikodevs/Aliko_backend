import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { HealthDashboardController } from './health-dashboard.controller';
import { HealthDashboardService } from './health-dashboard.service';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [HealthDashboardController],
  providers: [HealthDashboardService],
  exports: [HealthDashboardService],
})
export class HealthDashboardModule {}
