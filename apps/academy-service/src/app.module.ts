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
import { DiscussionsModule } from './discussions/discussions.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { OrientationModule } from './orientation/orientation.module';
import { CurriculumCrosswalkModule } from './curriculum-crosswalk/curriculum-crosswalk.module';
import { StudyGroupsModule } from './study-groups/study-groups.module';
import { SeatTimeModule } from './seat-time/seat-time.module';
import { SkillsLabModule } from './skills-lab/skills-lab.module';
import { ClinicalModule } from './clinical/clinical.module';
import { ExamSecurityModule } from './exam-security/exam-security.module';
import { InstructorsModule } from './instructors/instructors.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { SupportDeskModule } from './support-desk/support-desk.module';
import { GradebookModule } from './gradebook/gradebook.module';
import { CertificationModule } from './certification/certification.module';
import { ComplianceExporterModule } from './compliance-exporter/compliance-exporter.module';
import { RubricsModule } from './rubrics/rubrics.module';
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
    DiscussionsModule,
    AdmissionsModule,
    OrientationModule,
    CurriculumCrosswalkModule,
    StudyGroupsModule,
    SeatTimeModule,
    SkillsLabModule,
    ClinicalModule,
    ExamSecurityModule,
    InstructorsModule,
    EvaluationsModule,
    SupportDeskModule,
    GradebookModule,
    CertificationModule,
    ComplianceExporterModule,
    RubricsModule,
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
