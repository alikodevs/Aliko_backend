import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LessonAccessGuard } from './guards/lesson-access.guard';
import { InstructorLessonGuard } from './guards/instructor-lesson.guard';

@Module({
  imports: [PrismaModule],
  controllers: [LessonsController],
  providers: [LessonsService, LessonAccessGuard, InstructorLessonGuard],
  exports: [LessonsService],
})
export class LessonsModule {}
