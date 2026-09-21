import { Module } from '@nestjs/common';
import { AcademyProfileModule } from './academy-profile/academy-profile.module';
import { CohortModule } from './cohort/cohort.module';
import { ContentModule } from './content/content.module';
import { CourseModuleModule } from './course-module/course-module.module';
import { CourseModule } from './course/course.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { LessonModule } from './lesson/lesson.module';
import { NotificationModule } from './notification/notification.module';
import { ProgressAndAnalyticsModule } from './progress-and-analytics/progress-and-analytics.module';
import { TeachingScheduleModule } from './teaching-schedule/teaching-schedule.module';
import { AcademyController } from './academy-service.controller';
import { FileUploadModule } from './file-upload/file-upload.module';
import { ExercisesModule } from './exercise/exercise.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    AcademyProfileModule,
    CourseModule,
    CourseModuleModule,
    CohortModule,
    ContentModule,
    EnrollmentModule,
    LessonModule,
    NotificationModule,
    ProgressAndAnalyticsModule,
    TeachingScheduleModule,
    FileUploadModule,
    ExercisesModule,
    AnnouncementModule,
    ChatModule,
  ],
  controllers: [AcademyController],
})
export class AcademyServiceModule {}
