import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';

import { RubricsController } from '../apps/academy-service/src/rubrics/rubrics.controller';
import { DiscussionsController } from '../apps/academy-service/src/discussions/discussions.controller';
import { CourseModulesController } from '../apps/academy-service/src/course-modules/course-modules.controller';
import { LessonsController } from '../apps/academy-service/src/lessons/lessons.controller';
import { CurriculumCrosswalkController } from '../apps/academy-service/src/curriculum-crosswalk/curriculum-crosswalk.controller';
import { SkillsLabController } from '../apps/academy-service/src/skills-lab/skills-lab.controller';
import { ClinicalController } from '../apps/academy-service/src/clinical/clinical.controller';
import { ExamSecurityController } from '../apps/academy-service/src/exam-security/exam-security.controller';
import { StudyGroupsController } from '../apps/academy-service/src/study-groups/study-groups.controller';
import { SeatTimeController } from '../apps/academy-service/src/seat-time/seat-time.controller';
import { InstructorsController } from '../apps/academy-service/src/instructors/instructors.controller';
import { EvaluationsController } from '../apps/academy-service/src/evaluations/evaluations.controller';
import { SupportDeskController } from '../apps/academy-service/src/support-desk/support-desk.controller';
import { GradebookController } from '../apps/academy-service/src/gradebook/gradebook.controller';
import { CertificationController } from '../apps/academy-service/src/certification/certification.controller';
import { ComplianceExporterController } from '../apps/academy-service/src/compliance-exporter/compliance-exporter.controller';
import { AdmissionsController } from '../apps/academy-service/src/admissions/admissions.controller';
import { OrientationController } from '../apps/academy-service/src/orientation/orientation.controller';

import { CoursesController } from '../apps/academy-service/src/courses/courses.controller';

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
  prefix: string | string[];
  routes: InspectedRoute[];
}

const controllersToInspect: { name: string; target: any }[] = [
  { name: 'CoursesController', target: CoursesController },
  { name: 'RubricsController', target: RubricsController },
  { name: 'DiscussionsController', target: DiscussionsController },
  { name: 'CourseModulesController', target: CourseModulesController },
  { name: 'LessonsController', target: LessonsController },
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
  { name: 'AdmissionsController', target: AdmissionsController },
  { name: 'OrientationController', target: OrientationController },
];

function inspectController(name: string, target: any): ControllerInspection {
  const prefix = Reflect.getMetadata(PATH_METADATA, target);
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

  return { name, prefix, routes };
}

async function run() {
  console.log('\n========================================================================================');
  console.log('   🔍 ACADEMY SERVICE — HTTP ROUTE REGISTRATION & VERIFICATION SUITE');
  console.log('========================================================================================\n');

  let totalControllers = 0;
  let totalHttpRoutes = 0;
  let totalTcpPatterns = 0;
  let hasErrors = false;

  for (const { name, target } of controllersToInspect) {
    totalControllers++;
    const inspection = inspectController(name, target);
    console.log(`\n📦 Controller: \x1b[1m\x1b[36m${name}\x1b[0m (prefix: ${JSON.stringify(inspection.prefix)})`);

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
          : route.httpMethod === 'DELETE'
          ? '\x1b[31m'
          : '\x1b[90m';

      const httpDisplay = isHttp ? `${methodColor}${route.httpMethod.padEnd(6)}\x1b[0m` : '\x1b[90mTCP   \x1b[0m';
      const pathsDisplay = route.paths.length > 0 ? route.paths.join(' | ') : '(root)';
      const tcpDisplay =
        route.messagePatterns.length > 0 ? ` [TCP: ${route.messagePatterns.join(', ')}]` : '';

      console.log(`   ${httpDisplay} ${route.handler.padEnd(30)} paths: [${pathsDisplay}]${tcpDisplay}`);
    }

    if (controllerHttpRoutes === 0) {
      console.log(`   \x1b[31m✖ ERROR: Controller ${name} has NO HTTP routes registered!\x1b[0m`);
      hasErrors = true;
    } else {
      console.log(`   \x1b[32m✔ Registered ${controllerHttpRoutes} HTTP endpoint(s)\x1b[0m`);
    }
  }

  console.log('\n========================================================================================');
  console.log(`   TOTALS: ${totalControllers} Controllers | ${totalHttpRoutes} HTTP Endpoints | ${totalTcpPatterns} TCP Patterns`);
  console.log('========================================================================================\n');

  // Specific Deep Check for Rubrics Controller
  console.log('📋 Deep Checking RubricsController Endpoints...');
  const rubricsInspection = inspectController('RubricsController', RubricsController);
  const expectedRubricHandlers = ['create', 'findAll', 'findOne', 'update', 'remove', 'clone', 'evaluateWithRubric'];
  for (const handler of expectedRubricHandlers) {
    const found = rubricsInspection.routes.find((r) => r.handler === handler);
    if (!found) {
      console.log(`   \x1b[31m✖ Missing handler ${handler} on RubricsController\x1b[0m`);
      hasErrors = true;
    } else if (found.httpMethod === 'NONE') {
      console.log(`   \x1b[31m✖ Handler ${handler} on RubricsController has no HTTP verb!\x1b[0m`);
      hasErrors = true;
    } else {
      console.log(`   \x1b[32m✔ RubricsController.${handler}: ${found.httpMethod} -> [${found.paths.join(' | ')}]\x1b[0m`);
    }
  }

  // Unit Test Evaluation calculation logic in RubricsService
  console.log('\n🧪 Testing RubricsService Evaluation Logic...');
  const { RubricsService } = await import('../apps/academy-service/src/rubrics/rubrics.service');
  const mockPrisma: any = {
    rubric: {
      findUnique: async ({ where }: any) => {
        if (where.id === 'test-rubric-id') {
          return {
            id: 'test-rubric-id',
            name: 'Test Evaluation Rubric',
            type: 'DISCUSSION',
            criteria: [
              {
                id: 'crit-1',
                title: 'Criterion 1',
                maxPoints: 10,
                levels: [
                  { id: 'level-1-a', name: 'Exemplary', points: 10 },
                  { id: 'level-1-b', name: 'Competent', points: 7 },
                  { id: 'level-1-c', name: 'Developing', points: 4 },
                ],
              },
              {
                id: 'crit-2',
                title: 'Criterion 2',
                maxPoints: 5,
                levels: [
                  { id: 'level-2-a', name: 'Exemplary', points: 5 },
                  { id: 'level-2-b', name: 'Needs Work', points: 2 },
                ],
              },
            ],
          };
        }
        return null;
      },
    },
  };

  const rubricsService = new RubricsService(mockPrisma);

  // Test with scores
  const evalResult1 = await rubricsService.evaluateWithRubric({
    rubricId: 'test-rubric-id',
    scores: [
      { criterionId: 'crit-1', levelId: 'level-1-b', points: 7, feedback: 'Good job' },
      { criterionId: 'crit-2', levelId: 'level-2-a', points: 5, feedback: 'Flawless' },
    ],
  });

  console.log(`   Evaluation with scores: Total = ${evalResult1.totalEarnedPoints}/${evalResult1.totalPossiblePoints} (${evalResult1.percentageScore}%)`);
  if (evalResult1.totalEarnedPoints !== 12 || evalResult1.totalPossiblePoints !== 15 || evalResult1.percentageScore !== 80) {
    console.log(`   \x1b[31m✖ Calculation mismatch on scores!\x1b[0m`);
    hasErrors = true;
  } else {
    console.log(`   \x1b[32m✔ Score calculation passed: 12/15 = 80%\x1b[0m`);
  }

  // Test RubricsController methods directly with mock service
  console.log('\n🧪 Testing RubricsController Handler Execution...');
  const mockRubricsService: any = {
    create: async (userId: string, dto: any) => ({ id: 'new-rubric', ...dto, createdBy: userId }),
    findAll: async (filters: any) => ({ rubrics: [{ id: 'rubric-1', name: 'Sample Rubric' }], total: 1 }),
    findOne: async (id: string) => ({ id, name: 'Sample Rubric' }),
    update: async (userId: string, dto: any) => ({ ...dto, updatedBy: userId }),
    remove: async (id: string) => ({ success: true, message: `Rubric ${id} deleted` }),
    clone: async (userId: string, dto: any) => ({ id: `${dto.rubricId}-copy`, name: dto.newName, createdBy: userId }),
    evaluateWithRubric: async (dto: any) => ({ rubricId: dto.rubricId, totalEarnedPoints: 10 }),
  };

  const rubricsController = new RubricsController(mockRubricsService);

  const testUser = { firebaseId: 'inst-1', email: 'inst@example.com', roles: ['INSTRUCTOR'] };
  const reqMock: any = { user: testUser };

  // Test HTTP direct call (body is dto, req has user)
  const createdHttp = await rubricsController.create(
    { name: 'Direct HTTP Rubric', type: 'DISCUSSION' },
    reqMock
  );
  if (createdHttp.id === 'new-rubric' && createdHttp.createdBy === 'inst-1') {
    console.log('   \x1b[32m✔ RubricsController.create HTTP invocation passed\x1b[0m');
  } else {
    console.log('   \x1b[31m✖ RubricsController.create HTTP invocation failed\x1b[0m');
    hasErrors = true;
  }

  // Test TCP message call (payload is { dto, user })
  const createdTcp = await rubricsController.create(
    undefined,
    undefined,
    { dto: { name: 'TCP Rubric', type: 'DISCUSSION' }, user: { firebaseId: 'tcp-inst' } as any }
  );
  if (createdTcp.id === 'new-rubric' && createdTcp.createdBy === 'tcp-inst') {
    console.log('   \x1b[32m✔ RubricsController.create TCP invocation passed\x1b[0m');
  } else {
    console.log('   \x1b[31m✖ RubricsController.create TCP invocation failed\x1b[0m');
    hasErrors = true;
  }

  // Test evaluate HTTP call
  const evaluatedHttp = await rubricsController.evaluateWithRubric(
    { rubricId: 'r-1', scores: [{ criterionId: 'crit-1', points: 10 }] },
    reqMock
  );
  if (evaluatedHttp.totalEarnedPoints === 10) {
    console.log('   \x1b[32m✔ RubricsController.evaluateWithRubric HTTP invocation passed\x1b[0m');
  } else {
    console.log('   \x1b[31m✖ RubricsController.evaluateWithRubric HTTP invocation failed\x1b[0m');
    hasErrors = true;
  }

  console.log('\n========================================================================================');
  if (hasErrors) {
    console.log('   \x1b[31m❌ TEST SUITE COMPLETED WITH ERRORS\x1b[0m');
    process.exit(1);
  } else {
    console.log('   \x1b[32m✨ ALL CONTROLLER HTTP ROUTES & HANDLERS VERIFIED SUCCESSFULLY! ZERO 404S\x1b[0m');
    console.log('========================================================================================\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
