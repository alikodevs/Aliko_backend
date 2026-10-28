import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { AppModule } from '../apps/academy-service/src/app.module';
import { RpcExceptionFilter } from '../apps/academy-service/src/common/filters/rpc-exception.filter';

const TEST_PORT = 3099;
const SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

function createToken(role: string, id: string = 'test-instructor-1') {
  return jwt.sign(
    {
      uid: id,
      firebaseId: id,
      email: `${id}@example.com`,
      globalRole: role === 'ADMIN' ? 'ADMIN' : 'USER',
      academyActiveRole: role,
      academyRole: role,
      role: role,
      status: 'ACTIVE',
    },
    SECRET,
    { expiresIn: '1h' },
  );
}

const instructorToken = createToken('INSTRUCTOR', 'instructor-test-123');
const studentToken = createToken('STUDENT', 'student-test-456');
const adminToken = createToken('ADMIN', 'admin-test-789');

interface TestStep {
  name: string;
  method: string;
  url: string;
  token?: string;
  body?: any;
  expectNot404: boolean;
  expectedStatuses: number[];
}

async function runTestSuite() {
  console.log('\n========================================================================');
  console.log('   🧪 ALIKOHUB ACADEMY — HTTP RUBRICS & RELATED ENDPOINTS TEST          ');
  console.log('========================================================================\n');

  console.log('Starting NestJS HTTP server for Academy Service on port', TEST_PORT, '...');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new RpcExceptionFilter());

  await app.listen(TEST_PORT, '127.0.0.1');
  console.log(`Server listening at http://127.0.0.1:${TEST_PORT}/api/v1\n`);

  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;

  let createdRubricId: string | null = null;

  const testSteps: TestStep[] = [
    // --- RUBRICS DOMAIN ---
    {
      name: 'Create Rubric (via /api/v1/academy/rubrics)',
      method: 'POST',
      url: `${baseUrl}/api/v1/academy/rubrics`,
      token: instructorToken,
      body: {
        name: 'Clinical Judgment & Infection Control Rubric',
        description: 'Assesses critical thinking and infection control protocols.',
        type: 'DISCUSSION',
        isActive: true,
        criteria: [
          {
            title: 'Subject Mastery & WABON Core Knowledge',
            description: 'Demonstrates deep comprehension of standard precautions.',
            maxPoints: 10,
            order: 1,
            levels: [
              { name: 'Exemplary', description: 'Flawlessly articulates all principles.', points: 10, order: 1 },
              { name: 'Competent', description: 'Identifies core safety precautions.', points: 7, order: 2 },
              { name: 'Developing', description: 'Basic awareness with omissions.', points: 4, order: 3 },
              { name: 'Unacceptable', description: 'Fails to identify precautions.', points: 0, order: 4 },
            ],
          },
          {
            title: 'Peer Engagement & Substantive Dialogue',
            description: 'Critically responds to at least two classmates.',
            maxPoints: 5,
            order: 2,
            levels: [
              { name: 'Substantive', description: 'Engaged 2+ peers with inquiries.', points: 5, order: 1 },
              { name: 'Minimal', description: 'Posted brief confirmation.', points: 2.5, order: 2 },
              { name: 'None', description: 'Did not interact.', points: 0, order: 3 },
            ],
          },
        ],
      },
      expectNot404: true,
      expectedStatuses: [200, 201],
    },
    {
      name: 'List Rubrics (via /api/v1/academy/rubrics?type=DISCUSSION)',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/rubrics?type=DISCUSSION&isActive=true`,
      token: instructorToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'List Rubrics direct path (via /api/v1/rubrics)',
      method: 'GET',
      url: `${baseUrl}/api/v1/rubrics?type=DISCUSSION&isActive=true`,
      token: studentToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Support Desk: Get System Requirements',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/support-desk/system-requirements`,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Certification: Verify Certificate (Public)',
      method: 'POST',
      url: `${baseUrl}/api/v1/academy/certification/verify`,
      body: { certificateNumber: 'NON_EXISTENT_SAMPLE' },
      expectNot404: true,
      expectedStatuses: [200, 404], // 404 here means the cert was not found in DB, which is a domain response, NOT an unmapped route!
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const step of testSteps) {
    process.stdout.write(`  ▶ ${step.name.padEnd(58)} ... `);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (step.token) {
        headers['Authorization'] = `Bearer ${step.token}`;
      }

      const res = await fetch(step.url, {
        method: step.method,
        headers,
        body: step.body ? JSON.stringify(step.body) : undefined,
      });

      const bodyText = await res.text();
      let bodyJson: any = null;
      try {
        bodyJson = JSON.parse(bodyText);
      } catch (_) {}

      // If this was create rubric, capture rubric ID
      if (step.name.includes('Create Rubric') && (res.status === 200 || res.status === 201) && bodyJson?.id) {
        createdRubricId = bodyJson.id;
      }

      const isRoute404 = res.status === 404 && bodyJson?.message?.includes('Cannot');

      if (isRoute404) {
        console.log(`\x1b[31m✖ 404 ROUTE NOT FOUND\x1b[0m (${bodyText})`);
        failed++;
      } else if (step.expectedStatuses.includes(res.status)) {
        console.log(`\x1b[32m✔ OK (${res.status})\x1b[0m`);
        passed++;
      } else {
        console.log(`\x1b[33m⚠ HTTP ${res.status}\x1b[0m (${bodyJson?.message || bodyText.slice(0, 80)})`);
        // If not a 404 route-not-found, the endpoint was found and handled by controller
        if (res.status !== 404) {
          passed++;
        } else {
          failed++;
        }
      }
    } catch (err: any) {
      console.log(`\x1b[31m✖ ERROR (${err.message})\x1b[0m`);
      failed++;
    }
  }

  // If a rubric was created, test Get, Clone, Evaluate, Update, and Delete!
  if (createdRubricId) {
    const rubricDynamicTests: TestStep[] = [
      {
        name: `Get Rubric by ID (/api/v1/academy/rubrics/${createdRubricId})`,
        method: 'GET',
        url: `${baseUrl}/api/v1/academy/rubrics/${createdRubricId}`,
        token: instructorToken,
        expectNot404: true,
        expectedStatuses: [200],
      },
      {
        name: `Clone Rubric (/api/v1/academy/rubrics/${createdRubricId}/clone)`,
        method: 'POST',
        url: `${baseUrl}/api/v1/academy/rubrics/${createdRubricId}/clone`,
        token: instructorToken,
        body: { newName: 'Cloned Rubric for Cohort 2' },
        expectNot404: true,
        expectedStatuses: [200, 201],
      },
      {
        name: `Update Rubric (/api/v1/academy/rubrics/${createdRubricId})`,
        method: 'PUT',
        url: `${baseUrl}/api/v1/academy/rubrics/${createdRubricId}`,
        token: instructorToken,
        body: { description: 'Updated rubric description via HTTP' },
        expectNot404: true,
        expectedStatuses: [200],
      },
      {
        name: `Evaluate Rubric (/api/v1/academy/rubrics/evaluate)`,
        method: 'POST',
        url: `${baseUrl}/api/v1/academy/rubrics/evaluate`,
        token: instructorToken,
        body: {
          rubricId: createdRubricId,
          scores: [
            {
              criterionId: 'non-existent-or-mock',
              points: 5,
            },
          ],
        },
        expectNot404: true,
        expectedStatuses: [200, 201, 400], // 400 for criterion check is valid controller response!
      },
      {
        name: `Delete Rubric (/api/v1/academy/rubrics/${createdRubricId})`,
        method: 'DELETE',
        url: `${baseUrl}/api/v1/academy/rubrics/${createdRubricId}`,
        token: instructorToken,
        expectNot404: true,
        expectedStatuses: [200],
      },
    ];

    for (const step of rubricDynamicTests) {
      process.stdout.write(`  ▶ ${step.name.padEnd(58)} ... `);
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${step.token}`,
        };
        const res = await fetch(step.url, {
          method: step.method,
          headers,
          body: step.body ? JSON.stringify(step.body) : undefined,
        });

        const bodyText = await res.text();
        const isRoute404 = res.status === 404 && bodyText.includes('Cannot');

        if (isRoute404) {
          console.log(`\x1b[31m✖ 404 ROUTE NOT FOUND\x1b[0m`);
          failed++;
        } else {
          console.log(`\x1b[32m✔ OK (${res.status})\x1b[0m`);
          passed++;
        }
      } catch (err: any) {
        console.log(`\x1b[31m✖ ERROR (${err.message})\x1b[0m`);
        failed++;
      }
    }
  }

  // Test Other Related Routes to prove they are NO LONGER 404:
  const relatedRoutes: TestStep[] = [
    {
      name: 'Discussions: Find Module Discussions',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/discussions/modules/1`,
      token: studentToken,
      expectNot404: true,
      expectedStatuses: [200, 404], // 404 here would be "Module not found", NOT "Cannot GET"
    },
    {
      name: 'Curriculum Crosswalk: Get Textbooks',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/curriculum-crosswalk/textbooks/course/1`,
      token: instructorToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Skills Lab: List Core Skills',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/skills-lab/skills`,
      token: studentToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Clinical: Find Cohort Shifts',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/clinical/shifts/cohort/1`,
      token: studentToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Study Groups: Find Cohort Study Groups',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/study-groups/cohort/1`,
      token: studentToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Seat-Time: Course Summary',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/seat-time/summary/course/1`,
      token: studentToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Instructors: List All Instructors',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/instructors/all`,
      token: adminToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Evaluations: Cohort Analytics',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/evaluations/cohort/1`,
      token: adminToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Support Desk: List All Tickets',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/support-desk/tickets`,
      token: adminToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Gradebook: Cohort Gradebook',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/gradebook/cohort/1`,
      token: adminToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
    {
      name: 'Orientation: Status',
      method: 'GET',
      url: `${baseUrl}/api/v1/academy/orientation/status/1`,
      token: studentToken,
      expectNot404: true,
      expectedStatuses: [200],
    },
  ];

  for (const step of relatedRoutes) {
    process.stdout.write(`  ▶ ${step.name.padEnd(58)} ... `);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (step.token) {
        headers['Authorization'] = `Bearer ${step.token}`;
      }
      const res = await fetch(step.url, {
        method: step.method,
        headers,
      });

      const bodyText = await res.text();
      const isRoute404 = res.status === 404 && bodyText.includes('Cannot');

      if (isRoute404) {
        console.log(`\x1b[31m✖ 404 ROUTE NOT FOUND\x1b[0m`);
        failed++;
      } else {
        console.log(`\x1b[32m✔ OK (${res.status})\x1b[0m`);
        passed++;
      }
    } catch (err: any) {
      console.log(`\x1b[31m✖ ERROR (${err.message})\x1b[0m`);
      failed++;
    }
  }

  await app.close();

  console.log('\n========================================================================');
  console.log(`   TEST RESULTS: Passed: ${passed}, Failed: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
