import { Module } from '@nestjs/common';
import { CohortsService } from './cohorts.service';
import { CohortsController } from './cohorts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CohortAccessGuard } from './guards/cohort-access.guard';
import { InstructorCohortGuard } from './guards/instructor-cohort.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CohortsController],
  providers: [CohortsService, CohortAccessGuard, InstructorCohortGuard],
  exports: [CohortsService],
})
export class CohortsModule {}
