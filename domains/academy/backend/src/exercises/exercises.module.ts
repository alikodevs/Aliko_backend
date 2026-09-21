import { Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { ProgressAnalyticsModule } from '../progress-and-analytics/progress-analytics.module';

@Module({
  imports: [PrismaModule, UserModule, ProgressAnalyticsModule],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
