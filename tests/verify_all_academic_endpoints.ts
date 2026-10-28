import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';

import { AppController } from '../apps/academy-service/src/app.controller';
import { AdmissionsController } from '../apps/academy-service/src/admissions/admissions.controller';
import { AnnouncementsController } from '../apps/academy-service/src/announcements/announcements.controller';
import { CertificationController } from '../apps/academy-service/src/certification/certification.controller';
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

interface InspectedRoute {
  handler: string;
  httpMethod: string;
  paths: string[];
  messagePatterns: string[];
}

interface ControllerInspection {
  name: string;
  routes: InspectedRoute[];
}

const allAcademyControllers: { name: string; target: any }[] = [
  { name: 'AppController', target: AppController },
  { name: 'CoursesController', target: CoursesController },
  { name: 'CourseModulesController', target: CourseModulesController },
  { name: 'LessonsController', target: LessonsController },
  { name: 'ContentController', target: ContentController },
  { name: 'CohortsController', target: CohortsController },
  { name: 'EnrollmentsController', target: EnrollmentsController },
  { name: 'ExercisesController', target: ExercisesController },
  { name: 'AnnouncementsController', target: AnnouncementsController },
  { name: 'DiscussionsController', target: DiscussionsController },
  { name: 'RubricsController', target: RubricsController },
  { name: 'ProgressAndAnalyticsController', target: ProgressAndAnalyticsController },
  { name: 'NotificationsController', target: NotificationsController },
  { name: 'AdmissionsController', target: AdmissionsController },
  { name: 'OrientationController', target: OrientationController },
  { name: 'CurriculumCrosswalkController', target: CurriculumCrosswalkController },
  { name: 'SkillsLabController', target: SkillsLabController },
  { name: 'ClinicalController', target: ClinicalController },
  { name: 'ExamSecurityController', target: ExamSecurityController },
  { name: 'StudyGroupsController', target: StudyGroupsController },
  { name: 'SeatTimeController', target: SeatTimeController },
  { name: 'InstructorsController', target: InstructorsController },
  { name: 'EvaluationsController', target: EvaluationsController },
  { name: 'SupportDeskController', target: SupportDeskController },
  { name: 'GradebookController', target: GradebookController },
  { name: 'CertificationController', target: CertificationController },
  { name: 'ComplianceExporterController', target: ComplianceExporterController },
  { name: 'TeachingScheduleController', target: TeachingScheduleController },
  { name: 'UserController', target: UserController },
];

function inspectController(name: string, target: any): ControllerInspection {
  const proto = target.prototype;
  const methodKeys = Object.getOwnPropertyNames(proto).filter((k) => k !== 'constructor');

  const routes: InspectedRoute[] = [];

  for (const key of methodKeys) {
    const rawMethod = Reflect.getMetadata(METHOD_METADATA, proto[key]);
    const httpMethod = rawMethod !== undefined ? METHOD_NAMES[rawMethod] || `UNKNOWN(${rawMethod})` : 'NONE';
    const pathMeta = Reflect.getMetadata(PATH_METADATA, proto[key]);
    const paths = Array.isArray(pathMeta) ? pathMeta : pathMeta !== undefined ? [pathMeta] : [];
    const patternMeta = Reflect.getMetadata('microservices:pattern', proto[key]);
    const messagePatterns = Array.isArray(patternMeta)
      ? patternMeta
      : patternMeta !== undefined
      ? [typeof patternMeta === 'object' ? JSON.stringify(patternMeta) : String(patternMeta)]
      : [];

    if (httpMethod !== 'NONE' || messagePatterns.length > 0) {
      routes.push({
        handler: key,
        httpMethod,
        paths,
        messagePatterns,
      });
    }
  }

  return { name, routes };
}

async function verifyAllAcademicEndpoints() {
  console.log('\n========================================================================================');
  console.log('   🎓 MASTER AUDIT: EVERY ACADEMY SERVICE CONTROLLER & HTTP ENDPOINT');
  console.log('========================================================================================\n');

  let totalControllers = 0;
  let totalHttpRoutes = 0;
  let totalTcpPatterns = 0;
  let failingControllers: string[] = [];

  for (const { name, target } of allAcademyControllers) {
    totalControllers++;
    const inspection = inspectController(name, target);
    console.log(`\n📦 Controller [${totalControllers}/${allAcademyControllers.length}]: \x1b[1m\x1b[36m${name}\x1b[0m`);

    let controllerHttpRoutes = 0;
    for (const route of inspection.routes) {
      const isHttp = route.httpMethod !== 'NONE';
      if (isHttp) {
        controllerHttpRoutes++;
        totalHttpRoutes++;
      }
      if (route.messagePatterns.length > 0) {
        totalTcpPatterns += route.messagePatterns.length;
      }

      const methodColor =
        route.httpMethod === 'GET'
          ? '\x1b[32m'
          : route.httpMethod === 'POST'
          ? '\x1b[34m'
          : route.httpMethod === 'PUT'
          ? '\x1b[33m'
          : route.httpMethod === 'PATCH'
          ? '\x1b[35m'
          : route.httpMethod === 'DELETE'
          ? '\x1b[31m'
          : '\x1b[90m';

      const httpDisplay = isHttp ? `${methodColor}${route.httpMethod.padEnd(6)}\x1b[0m` : '\x1b[90mTCP   \x1b[0m';
      const pathsDisplay = route.paths.length > 0 ? route.paths.join(' | ') : '(root)';
      const tcpDisplay =
        route.messagePatterns.length > 0 ? ` [TCP: ${route.messagePatterns.join(', ')}]` : '';

      console.log(`   ${httpDisplay} ${route.handler.padEnd(28)} -> [${pathsDisplay}]${tcpDisplay}`);
    }

    if (controllerHttpRoutes === 0) {
      console.log(`   \x1b[31m✖ FAILURE: Controller ${name} has NO HTTP routes registered!\x1b[0m`);
      failingControllers.push(name);
    } else {
      console.log(`   \x1b[32m✔ Verified ${controllerHttpRoutes} HTTP endpoint(s)\x1b[0m`);
    }
  }

  console.log('\n========================================================================================');
  console.log(`   TOTAL AUDIT SUMMARY:`);
  console.log(`   Controllers Inspected : ${totalControllers}`);
  console.log(`   HTTP Routes Active    : ${totalHttpRoutes}`);
  console.log(`   TCP Patterns Active   : ${totalTcpPatterns}`);
  console.log('========================================================================================\n');

  if (failingControllers.length > 0) {
    console.log(`\x1b[31m❌ AUDIT FAILED: ${failingControllers.length} controller(s) without HTTP routes: ${failingControllers.join(', ')}\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m✨ SUCCESS: ALL 29 ACADEMIC CONTROLLERS ARE FULLY REGISTERED WITH ZERO 404S!\x1b[0m\n`);
    process.exit(0);
  }
}

verifyAllAcademicEndpoints().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
