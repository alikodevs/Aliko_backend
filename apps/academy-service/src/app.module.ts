import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '@aliko/config';
import { AppLoggerModule } from '@aliko/logger';
import { EventBusModule } from '@aliko/event-bus';
import { PrismaModule } from './prisma/prisma.module';
import { CoursesModule } from './courses/courses.module';
import { CohortsModule } from './cohorts/cohorts.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { CourseModulesModule } from './course-modules/course-modules.module';
import { LessonsModule } from './lessons/lessons.module';
import { UserModule } from './user/user.module';
import { ContentModule } from './content/content.module';
import { ProgressAnalyticsModule } from './progress-and-analytics/progress-analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UserApplicationModule } from './user-application/user-application.module';
import { TeachingScheduleModule } from './teaching-schedule/teaching-schedule.module';
import { AcademyProfileGuard } from './auth/academy-profile.guard';
import { RoleGuard } from './auth/role-guard/role-guard';
import { ExercisesModule } from './exercises/exercises.module';
import { AppController } from './app.controller';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ChatModule } from './chat/chat.module';
import { PrismaService } from './database/prisma.service';
import { AcademyOutboxPublisherWorker } from './modules/events/academy-outbox-publisher.worker';
import { AcademyEventsConsumer } from './modules/events/academy-events.consumer';
import { UserServiceClient } from './integrations/user-service.client';

@Global()
@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    EventBusModule,
    PrismaModule,
    UserModule,
    CoursesModule,
    CohortsModule,
    EnrollmentsModule,
    CourseModulesModule,
    LessonsModule,
    ContentModule,
    ProgressAnalyticsModule,
    NotificationsModule,
    UserApplicationModule,
    TeachingScheduleModule,
    ExercisesModule,
    AnnouncementsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    PrismaService,
    AcademyOutboxPublisherWorker,
    AcademyEventsConsumer,
    AcademyProfileGuard,
    RoleGuard,
    UserServiceClient,
  ],
  exports: [PrismaService, UserServiceClient],
})
export class AppModule {}
