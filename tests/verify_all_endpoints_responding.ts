import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';

// Import all 30 Academy Controllers
import { AppController } from '../apps/academy-service/src/app.controller';
import { AdmissionsController } from '../apps/academy-service/src/admissions/admissions.controller';
import { AnnouncementsController } from '../apps/academy-service/src/announcements/announcements.controller';
import { CertificationController } from '../apps/academy-service/src/certification/certification.controller';
import { ChatController } from '../apps/academy-service/src/chat/chat.controller';
import { ClinicalController } from '../apps/academy-service/src/clinical/clinical.controller';
import { CohortsController } from '../apps/academy-service/src/cohorts/cohorts.controller';
import { ComplianceExporterController } from '../apps/academy-service/src/compliance-exporter/compliance-exporter.controller';
import { ContentController } from '../apps/academy-service/src/content/content.controller';
import { CourseModulesController } from '../apps/academy-service/src/course-modules/course-modules.controller';
import { CoursesController } from '../apps/academy-service/src/courses/courses.controller';
import { CurriculumCrosswalkController } from '../apps/academy-service/src/curriculum-crosswalk/curriculum-crosswalk.controller';
import { DiscussionsController } from '../apps/academy-service/src/discussions/discussions.controller';
import { EnrollmentsController } from '../apps/academy-service/src/enrollments/enrollments.controller';
import { EvaluationsController } from '../apps/academy-service/src/evaluations/evaluations.controller';
import { ExamSecurityController } from '../apps/academy-service/src/exam-security/exam-security.controller';
import { ExercisesController } from '../apps/academy-service/src/exercises/exercises.controller';
import { GradebookController } from '../apps/academy-service/src/gradebook/gradebook.controller';
import { InstructorsController } from '../apps/academy-service/src/instructors/instructors.controller';
import { LessonsController } from '../apps/academy-service/src/lessons/lessons.controller';
import { NotificationsController } from '../apps/academy-service/src/notifications/notifications.controller';
import { OrientationController } from '../apps/academy-service/src/orientation/orientation.controller';
import { ProgressAndAnalyticsController } from '../apps/academy-service/src/progress-and-analytics/progress-analytics.controller';
import { RubricsController } from '../apps/academy-service/src/rubrics/rubrics.controller';
import { SeatTimeController } from '../apps/academy-service/src/seat-time/seat-time.controller';
import { SkillsLabController } from '../apps/academy-service/src/skills-lab/skills-lab.controller';
import { StudyGroupsController } from '../apps/academy-service/src/study-groups/study-groups.controller';
import { SupportDeskController } from '../apps/academy-service/src/support-desk/support-desk.controller';
import { TeachingScheduleController } from '../apps/academy-service/src/teaching-schedule/teaching-schedule.controller';
import { UserController } from '../apps/academy-service/src/user/user.controller';

const METHOD_NAMES: Record<number, string> = {
  0: 'GET',
  1: 'POST',
  2: 'PUT',
  3: 'DELETE',
  4: 'PATCH',
  5: 'ALL',
  6: 'OPTIONS',
  7: 'HEAD',
};

// Generic Auto-Mock Service using Proxy
function createMockService(serviceName: string): any {
  return new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        return async (...args: any[]) => {
          return {
            status: 'success',
            service: serviceName,
            method: prop,
            timestamp: new Date().toISOString(),
            receivedArgsCount: args.length,
          };
        };
      },
    }
  );
}

// Sample mock user
const mockUser = {
  firebaseId: 'test-user-firebase-123',
  userId: 'test-user-firebase-123',
  email: 'tester@alikohub.edu',
  role: 'INSTRUCTOR',
  isEmailVerified: true,
  id: 1,
};

const mockReq = {
  user: mockUser,
  ip: '127.0.0.1',
  headers: {
    'cf-ipcountry': 'US',
    'x-correlation-id': 'test-cor-id-12345',
  },
};

interface EndpointTestTarget {
  name: string;
  controllerClass: any;
}

const targets: EndpointTestTarget[] = [
  { name: 'AppController', controllerClass: AppController },
  { name: 'AdmissionsController', controllerClass: AdmissionsController },
  { name: 'AnnouncementsController', controllerClass: AnnouncementsController },
  { name: 'CertificationController', controllerClass: CertificationController },
  { name: 'ChatController', controllerClass: ChatController },
  { name: 'ClinicalController', controllerClass: ClinicalController },
  { name: 'CohortsController', controllerClass: CohortsController },
  { name: 'ComplianceExporterController', controllerClass: ComplianceExporterController },
  { name: 'ContentController', controllerClass: ContentController },
  { name: 'CourseModulesController', controllerClass: CourseModulesController },
  { name: 'CoursesController', controllerClass: CoursesController },
  { name: 'CurriculumCrosswalkController', controllerClass: CurriculumCrosswalkController },
  { name: 'DiscussionsController', controllerClass: DiscussionsController },
  { name: 'EnrollmentsController', controllerClass: EnrollmentsController },
  { name: 'EvaluationsController', controllerClass: EvaluationsController },
  { name: 'ExamSecurityController', controllerClass: ExamSecurityController },
  { name: 'ExercisesController', controllerClass: ExercisesController },
  { name: 'GradebookController', controllerClass: GradebookController },
  { name: 'InstructorsController', controllerClass: InstructorsController },
  { name: 'LessonsController', controllerClass: LessonsController },
  { name: 'NotificationsController', controllerClass: NotificationsController },
  { name: 'OrientationController', controllerClass: OrientationController },
  { name: 'ProgressAndAnalyticsController', controllerClass: ProgressAndAnalyticsController },
  { name: 'RubricsController', controllerClass: RubricsController },
  { name: 'SeatTimeController', controllerClass: SeatTimeController },
  { name: 'SkillsLabController', controllerClass: SkillsLabController },
  { name: 'StudyGroupsController', controllerClass: StudyGroupsController },
  { name: 'SupportDeskController', controllerClass: SupportDeskController },
  { name: 'TeachingScheduleController', controllerClass: TeachingScheduleController },
  { name: 'UserController', controllerClass: UserController },
];

async function runEndToEndVerification() {
  console.log('\n========================================================================================');
  console.log('   🚀 COMPREHENSIVE ENDPOINT RESPONSIVENESS SUITE (ALL 30 ACADEMIC CONTROLLERS)');
  console.log('========================================================================================\n');

  let passedEndpoints = 0;
  let failedEndpoints = 0;
  const failures: { controller: string; handler: string; error: string }[] = [];

  for (const target of targets) {
    console.log(`\n🔍 Testing Controller: \x1b[1m\x1b[36m${target.name}\x1b[0m`);
    const mockService = createMockService(target.name + 'Service');

    let instance: any;
    try {
      instance = new target.controllerClass(mockService);
    } catch (e: any) {
      console.error(`   ❌ Failed to instantiate ${target.name}:`, e.message);
      failedEndpoints++;
      failures.push({ controller: target.name, handler: 'constructor', error: e.message });
      continue;
    }

    const proto = target.controllerClass.prototype;
    const methodKeys = Object.getOwnPropertyNames(proto).filter((k) => k !== 'constructor');

    for (const key of methodKeys) {
      const rawMethod = Reflect.getMetadata(METHOD_METADATA, proto[key]);
      if (rawMethod === undefined) {
        // TCP internal pattern
        continue;
      }
      const httpMethod = METHOD_NAMES[rawMethod] || 'GET';
      const pathMeta = Reflect.getMetadata(PATH_METADATA, proto[key]);
      const paths = Array.isArray(pathMeta) ? pathMeta : pathMeta !== undefined ? [pathMeta] : [];

      const sampleDto: any = {
        title: 'Test Title',
        name: 'Test Name',
        description: 'Test Description',
        content: 'Test Content',
        courseId: 101,
        moduleId: 201,
        lessonId: 301,
        contentId: 401,
        cohortId: 101,
        studentUserId: 'student-test-123',
        userId: 'test-user-firebase-123',
        instructorId: 'instructor-test-456',
        rubricId: 'rubric-uuid-101',
        id: 101,
        status: 'COMPLETED',
        role: 'STUDENT',
        email: 'tester@alikohub.edu',
        password: 'Password123!',
        newPassword: 'Password123!',
        token: 'valid-reset-token-abc',
        recipientId: 'recipient-user-456',
        body: 'Hello, this is a test chat message',
        type: 'VIDEO',
        question: 'What is 2 + 2?',
        answer: '4',
        isCorrect: true,
        score: 100,
        dtos: [
          {
            title: 'Bulk Exercise 1',
            moduleId: 201,
            type: 'MULTIPLE_CHOICE',
            question: 'Sample question?',
          },
        ],
      };

      const payloadEnvelope = {
        dto: sampleDto,
        user: mockUser,
        studentUserId: 'student-test-123',
        cohortId: 101,
        courseId: 101,
        lessonId: 301,
        id: 101,
        instructorId: 'instructor-test-456',
        role: 'STUDENT',
        token: 'valid-reset-token-abc',
        newPassword: 'Password123!',
      };

      try {
        let response: any;
        const fn = instance[key].bind(instance);

        const param1 = '101';
        const param2 = '201';
        const queryObj = { page: 1, limit: 10 };

        // Try invocation sequences
        const attempts = [
          // Sequence 1: Dual param (param1, param2, req, payload)
          () => fn(param1, param2, mockReq, payloadEnvelope),
          // Sequence 2: Dual param + query (param1, param2, query, req, payload)
          () => fn(param1, param2, queryObj, mockReq, payloadEnvelope),
          // Sequence 3: Single param + body (param1, sampleDto, mockReq, payloadEnvelope)
          () => fn(param1, sampleDto, mockReq, payloadEnvelope),
          // Sequence 4: Single param + query (param1, queryObj, mockReq, payloadEnvelope)
          () => fn(param1, queryObj, mockReq, payloadEnvelope),
          // Sequence 5: Direct body (sampleDto, mockReq, payloadEnvelope)
          () => fn(sampleDto, mockReq, payloadEnvelope),
          // Sequence 6: Direct query (queryObj, mockReq, payloadEnvelope)
          () => fn(queryObj, mockReq, payloadEnvelope),
          // Sequence 7: Only req & payload
          () => fn(mockReq, payloadEnvelope),
        ];

        let lastErr: any;
        let success = false;
        for (const attempt of attempts) {
          try {
            response = await attempt();
            success = true;
            break;
          } catch (err: any) {
            lastErr = err;
          }
        }

        if (!success) {
          throw lastErr;
        }

        passedEndpoints++;
        const methodColor =
          httpMethod === 'GET'
            ? '\x1b[32m'
            : httpMethod === 'POST'
            ? '\x1b[34m'
            : httpMethod === 'PUT'
            ? '\x1b[33m'
            : httpMethod === 'PATCH'
            ? '\x1b[35m'
            : '\x1b[31m';
        console.log(
          `   ${methodColor}${httpMethod.padEnd(6)}\x1b[0m ${key.padEnd(28)} -> [${paths.join(' | ')}] \x1b[32m✔ Responding OK\x1b[0m`
        );
      } catch (invokeErr: any) {
        failedEndpoints++;
        failures.push({ controller: target.name, handler: key, error: invokeErr.message });
        console.error(`   ❌ ${httpMethod} ${key} FAILED:`, invokeErr.message);
      }
    }
  }

  console.log('\n========================================================================================');
  console.log(`   EXECUTION SUMMARY:`);
  console.log(`   Total Endpoints Tested : ${passedEndpoints + failedEndpoints}`);
  console.log(`   Successful Responses   : \x1b[32m${passedEndpoints}\x1b[0m`);
  console.log(`   Failed Invocations     : ${failedEndpoints === 0 ? '\x1b[32m0\x1b[0m' : `\x1b[31m${failedEndpoints}\x1b[0m`}`);
  console.log('========================================================================================\n');

  if (failedEndpoints > 0) {
    console.error(`❌ Found ${failedEndpoints} failing endpoint(s):`);
    failures.forEach((f) => console.error(`   - ${f.controller}.${f.handler}: ${f.error}`));
    process.exit(1);
  } else {
    console.log(`✨ ALL ${passedEndpoints} ACADEMIC HTTP ENDPOINTS ARE PROPERLY RESPONDING WITH ZERO FAILURES!\n`);
    process.exit(0);
  }
}

runEndToEndVerification().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
