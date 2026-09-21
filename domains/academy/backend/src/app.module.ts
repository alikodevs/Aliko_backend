import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CoursesModule } from './courses/courses.module';
import { ConfigModule } from '@nestjs/config';
import { CohortsModule } from './cohorts/cohorts.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { CourseModulesModule } from './course-modules/course-modules.module';
import { LessonsModule } from './lessons/lessons.module';
import { UserModule } from './user/user.module';
import { ContentModule } from './content/content.module';
import { ProgressAnalyticsModule } from './progress-and-analytics/progress-analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
// import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserApplicationModule } from './user-application/user-application.module';
import { TeachingScheduleModule } from './teaching-schedule/teaching-schedule.module';
import { AcademyProfileGuard } from './auth/academy-profile.guard';
import { RoleGuard } from './auth/role-guard/role-guard';
import { ExercisesModule } from './exercises/exercises.module';
import { RpcExceptionFilter } from './common/filters/rpc-exception.filter';
import { AppController } from './app.controller';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ChatModule } from './chat/chat.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    AcademyProfileGuard,
    RoleGuard,
    {
      provide: APP_FILTER,
      useClass: RpcExceptionFilter,
    },
  ],
})
export class AppModule {}
