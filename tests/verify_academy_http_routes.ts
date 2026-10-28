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
  const expectedRubricHandlers = ['create', 'findAll', 'findOne', 'update', 'delete', 'clone', 'evaluate'];
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
    rubricEvaluation: {
      create: async ({ data }: any) => {
        return {
          id: 'eval-123',
          ...data,
          createdAt: new Date(),
        };
      },
    },
  };

  const rubricsService = new RubricsService(mockPrisma);

  // Test with criteriaScores
  const evalResult1 = await rubricsService.evaluateWithRubric({
    rubricId: 'test-rubric-id',
    studentId: 'student-1',
    criteriaScores: [
      { criterionId: 'crit-1', levelId: 'level-1-b', points: 7, feedback: 'Good job' },
      { criterionId: 'crit-2', levelId: 'level-2-a', points: 5, feedback: 'Flawless' },
    ],
    evaluatorId: 'instructor-1',
    overallFeedback: 'Great overall effort',
  });

  console.log(`   Evaluation with criteriaScores: Total = ${evalResult1.totalScore}/${evalResult1.maxScore} (${evalResult1.percentage}%)`);
  if (evalResult1.totalScore !== 12 || evalResult1.maxScore !== 15 || evalResult1.percentage !== 80) {
    console.log(`   \x1b[31m✖ Calculation mismatch on criteriaScores!\x1b[0m`);
    hasErrors = true;
  } else {
    console.log(`   \x1b[32m✔ Score calculation passed: 12/15 = 80%\x1b[0m`);
  }

  // Test with selectedLevelIds
  const evalResult2 = await rubricsService.evaluateWithRubric({
    rubricId: 'test-rubric-id',
    studentId: 'student-2',
    selectedLevelIds: ['level-1-a', 'level-2-b'],
    evaluatorId: 'instructor-1',
    customFeedback: 'Evaluated using selectedLevelIds shortcut',
  });

  console.log(`   Evaluation with selectedLevelIds: Total = ${evalResult2.totalScore}/${evalResult2.maxScore} (${evalResult2.percentage}%)`);
  if (evalResult2.totalScore !== 12 || evalResult2.maxScore !== 15 || evalResult2.percentage !== 80) {
    console.log(`   \x1b[31m✖ Calculation mismatch on selectedLevelIds!\x1b[0m`);
    hasErrors = true;
  } else {
    console.log(`   \x1b[32m✔ Shortcut calculation passed: 10 + 2 = 12/15 = 80%\x1b[0m`);
  }

  // Test RubricsController methods directly with mock service
  console.log('\n🧪 Testing RubricsController Handler Execution...');
  const mockRubricsService: any = {
    create: async (dto: any, user: any) => ({ id: 'new-rubric', ...dto, createdBy: user.userId }),
    findAll: async (filters: any) => [{ id: 'rubric-1', name: 'Sample Rubric' }],
    findOne: async (id: string) => ({ id, name: 'Sample Rubric' }),
    update: async (id: string, dto: any) => ({ id, ...dto }),
    delete: async (id: string) => ({ success: true, id }),
    cloneRubric: async (id: string, user: any) => ({ id: `${id}-copy`, clonedFrom: id }),
    evaluateWithRubric: async (dto: any, user: any) => ({ id: 'eval-1', score: 10 }),
  };

  const rubricsController = new RubricsController(mockRubricsService);

  const testUser = { userId: 'inst-1', role: 'INSTRUCTOR' };
  const reqMock: any = { academyProfile: testUser };

  // Test HTTP direct call (body is dto, req has academyProfile)
  const createdHttp = await rubricsController.create(
    { name: 'Direct HTTP Rubric' },
    reqMock
  );
  if (createdHttp.id === 'new-rubric' && createdHttp.createdBy === 'inst-1') {
    console.log('   \x1b[32m✔ RubricsController.create HTTP invocation passed\x1b[0m');
  } else {
    console.log('   \x1b[31m✖ RubricsController.create HTTP invocation failed\x1b[0m');
    hasErrors = true;
  }

  // Test TCP message call (body is { dto, user })
  const createdTcp = await rubricsController.create(
    { dto: { name: 'TCP Rubric' }, user: { userId: 'tcp-inst' } },
    undefined as any
  );
  if (createdTcp.id === 'new-rubric' && createdTcp.createdBy === 'tcp-inst') {
    console.log('   \x1b[32m✔ RubricsController.create TCP invocation passed\x1b[0m');
  } else {
    console.log('   \x1b[31m✖ RubricsController.create TCP invocation failed\x1b[0m');
    hasErrors = true;
  }

  // Test evaluate HTTP call
  const evaluatedHttp = await rubricsController.evaluate(
    { rubricId: 'r-1', selectedLevelIds: ['lvl-1'] },
    reqMock
  );
  if (evaluatedHttp.id === 'eval-1') {
    console.log('   \x1b[32m✔ RubricsController.evaluate HTTP invocation passed\x1b[0m');
  } else {
    console.log('   \x1b[31m✖ RubricsController.evaluate HTTP invocation failed\x1b[0m');
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
