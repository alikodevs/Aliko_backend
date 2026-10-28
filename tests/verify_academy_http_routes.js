require('reflect-metadata');
const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';

const { RubricsController } = require('../dist/apps/academy-service/apps/academy-service/src/rubrics/rubrics.controller');
const { DiscussionsController } = require('../dist/apps/academy-service/apps/academy-service/src/discussions/discussions.controller');
const { CourseModulesController } = require('../dist/apps/academy-service/apps/academy-service/src/course-modules/course-modules.controller');
const { LessonsController } = require('../dist/apps/academy-service/apps/academy-service/src/lessons/lessons.controller');
const { CurriculumCrosswalkController } = require('../dist/apps/academy-service/apps/academy-service/src/curriculum-crosswalk/curriculum-crosswalk.controller');
const { SkillsLabController } = require('../dist/apps/academy-service/apps/academy-service/src/skills-lab/skills-lab.controller');
const { ClinicalController } = require('../dist/apps/academy-service/apps/academy-service/src/clinical/clinical.controller');
const { ExamSecurityController } = require('../dist/apps/academy-service/apps/academy-service/src/exam-security/exam-security.controller');
const { StudyGroupsController } = require('../dist/apps/academy-service/apps/academy-service/src/study-groups/study-groups.controller');
const { SeatTimeController } = require('../dist/apps/academy-service/apps/academy-service/src/seat-time/seat-time.controller');
const { InstructorsController } = require('../dist/apps/academy-service/apps/academy-service/src/instructors/instructors.controller');
const { EvaluationsController } = require('../dist/apps/academy-service/apps/academy-service/src/evaluations/evaluations.controller');
const { SupportDeskController } = require('../dist/apps/academy-service/apps/academy-service/src/support-desk/support-desk.controller');
const { GradebookController } = require('../dist/apps/academy-service/apps/academy-service/src/gradebook/gradebook.controller');
const { CertificationController } = require('../dist/apps/academy-service/apps/academy-service/src/certification/certification.controller');
const { ComplianceExporterController } = require('../dist/apps/academy-service/apps/academy-service/src/compliance-exporter/compliance-exporter.controller');
const { AdmissionsController } = require('../dist/apps/academy-service/apps/academy-service/src/admissions/admissions.controller');
const { OrientationController } = require('../dist/apps/academy-service/apps/academy-service/src/orientation/orientation.controller');
const { RubricsService } = require('../dist/apps/academy-service/apps/academy-service/src/rubrics/rubrics.service');

const METHOD_NAMES = {
  0: 'GET',
  1: 'POST',
  2: 'PUT',
  3: 'DELETE',
  4: 'PATCH',
  5: 'ALL',
  6: 'OPTIONS',
  7: 'HEAD',
};

const controllersToInspect = [
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

function inspectController(name, target) {
  const prefix = Reflect.getMetadata(PATH_METADATA, target);
  const proto = target.prototype;
  const methodKeys = Object.getOwnPropertyNames(proto).filter((k) => k !== 'constructor');

  const routes = [];

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
    console.log(`📦 Controller: \x1b[1m\x1b[36m${name}\x1b[0m (prefix: ${JSON.stringify(inspection.prefix)})`);

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
      console.log(`   \x1b[31m✖ ERROR: Controller ${name} has NO HTTP routes registered!\x1b[0m\n`);
      hasErrors = true;
    } else {
      console.log(`   \x1b[32m✔ Registered ${controllerHttpRoutes} HTTP endpoint(s)\x1b[0m\n`);
    }
  }

  console.log('========================================================================================');
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
  const mockPrisma = {
    rubric: {
      findUnique: async ({ where }) => {
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
      create: async ({ data }) => {
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

  console.log(`   Evaluation with criteriaScores: Total = ${evalResult1.totalEarnedPoints}/${evalResult1.totalPossiblePoints} (${evalResult1.percentageScore}%)`);
  if (evalResult1.totalEarnedPoints !== 12 || evalResult1.totalPossiblePoints !== 15 || evalResult1.percentageScore !== 80) {
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

  console.log(`   Evaluation with selectedLevelIds: Total = ${evalResult2.totalEarnedPoints}/${evalResult2.totalPossiblePoints} (${evalResult2.percentageScore}%)`);
  if (evalResult2.totalEarnedPoints !== 12 || evalResult2.totalPossiblePoints !== 15 || evalResult2.percentageScore !== 80) {
    console.log(`   \x1b[31m✖ Calculation mismatch on selectedLevelIds!\x1b[0m`);
    hasErrors = true;
  } else {
    console.log(`   \x1b[32m✔ Shortcut calculation passed: 10 + 2 = 12/15 = 80%\x1b[0m`);
  }

  // Test RubricsController methods directly with mock service
  console.log('\n🧪 Testing RubricsController Handler Execution...');
  const mockRubricsService = {
    create: async (userId, dto) => ({ id: 'new-rubric', ...dto, createdBy: userId }),
    findAll: async (filters) => [{ id: 'rubric-1', name: 'Sample Rubric' }],
    findOne: async (id) => ({ id, name: 'Sample Rubric' }),
    update: async (userId, dto) => ({ id: dto.id, ...dto }),
    remove: async (id) => ({ success: true, id }),
    clone: async (userId, dto) => ({ id: `${dto.rubricId}-copy`, clonedFrom: dto.rubricId }),
    evaluateWithRubric: async (dto) => ({ id: 'eval-1', score: 10 }),
  };

  const rubricsController = new RubricsController(mockRubricsService);

  const testUser = { firebaseId: 'inst-1', userId: 'inst-1', role: 'INSTRUCTOR' };
  const reqMock = { user: testUser, academyProfile: testUser };

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
    undefined
  );
  if (createdTcp.id === 'new-rubric' && createdTcp.createdBy === 'tcp-inst') {
    console.log('   \x1b[32m✔ RubricsController.create TCP invocation passed\x1b[0m');
  } else {
    console.log('   \x1b[31m✖ RubricsController.create TCP invocation failed\x1b[0m');
    hasErrors = true;
  }

  // Test remove HTTP call
  const removedHttp = await rubricsController.remove('r-1', reqMock);
  if (removedHttp.success) {
    console.log('   \x1b[32m✔ RubricsController.remove HTTP invocation passed\x1b[0m');
  } else {
    console.log('   \x1b[31m✖ RubricsController.remove HTTP invocation failed\x1b[0m');
    hasErrors = true;
  }

  // Test evaluate HTTP call
  const evaluatedHttp = await rubricsController.evaluateWithRubric(
    { rubricId: 'r-1', selectedLevelIds: ['lvl-1'] },
    reqMock
  );
  if (evaluatedHttp.id === 'eval-1') {
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
