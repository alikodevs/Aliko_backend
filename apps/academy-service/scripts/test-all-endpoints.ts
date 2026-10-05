
import { ClientProxyFactory, Transport, ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = parseInt(process.env.PORT || '3005');

async function runTests() {
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port: PORT },
  });

  console.log(`Connecting to Academy Service on port ${PORT}...`);

  const adminUser = {
    firebaseId: 'test-user-admin-' + Math.floor(Math.random() * 1000),
    globalRole: 'ADMIN',
  };

  const studentUser = {
    firebaseId: 'test-user-student-' + Math.floor(Math.random() * 1000),
    globalRole: 'USER',
  };

  const results = [];

  async function testEndpoint(cmd: string | { cmd: string }, payload: any) {
    const cmdName = typeof cmd === 'string' ? cmd : cmd.cmd;
    try {
      console.log(`[TEST] ${cmdName}...`);
      const response = await firstValueFrom(client.send(cmd, payload));
      console.log(`[SUCCESS] ${cmdName}`);
      results.push({ cmd: cmdName, status: 'SUCCESS', response });
      return response;
    } catch (error) {
      console.error(`[FAILURE] ${cmdName}:`, error.message);
      results.push({ cmd: cmdName, status: 'FAILURE', error: error.message });
      return null;
    }
  }

  // 1. Setup Profiles
  await testEndpoint({ cmd: 'get_academy_profile' }, { user: adminUser });
  await testEndpoint({ cmd: 'get_academy_profile' }, { user: studentUser });
  await testEndpoint({ cmd: 'select_academy_role' }, { userId: studentUser.firebaseId, role: 'STUDENT', user: studentUser });

  // 2. Courses
  const course = await testEndpoint({ cmd: 'create_course' }, {
    dto: {
      title: 'Intro to NestJS ' + Date.now(),
      description: 'Learn NestJS basics',
      price: 49,
      difficulty: 'BEGINNER',
      category: 'Web Development',
      learningOutcomes: ['Understand modules', 'Learn controllers'],
      requirements: ['Basic JS knowledge'],
      instructorId: adminUser.firebaseId
    },
    user: adminUser
  });

  if (course) {
    await testEndpoint({ cmd: 'update_course_status' }, { id: course.id, status: 'PUBLISHED', user: adminUser });

    // 3. Cohorts
    const cohort = await testEndpoint({ cmd: 'create_cohort' }, {
      dto: {
        name: 'Fall 2025',
        courseId: course.id,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      user: adminUser
    });

    // 4. Course Modules
    const module = await testEndpoint({ cmd: 'create_course_module' }, {
      dto: {
        title: 'Module 1: Getting Started',
        description: 'Basic introduction to concepts',
        courseId: course.id
      },
      user: adminUser
    });

    if (module) {
      // 5. Lessons - FIXED: Removed extra fields
      const lesson = await testEndpoint({ cmd: 'create_lesson' }, {
        dto: {
          title: 'Your First Controller',
          moduleId: module.id,
          type: 'VIDEO',
          contents: [{
            title: 'Intro Video',
            type: 'VIDEO',
            url: 'https://example.com/v1'
          }]
        },
        user: adminUser
      });

      if (lesson) {
        await testEndpoint({ cmd: 'find_lessons_by_module' }, { moduleId: module.id, user: adminUser });
      }
    }

    // 6. Enrollments
    // Note: enrollment might still fail if auth-service check fails.
    // I'll try to enroll the student user that we just created a profile for.
    const enrollment = await testEndpoint({ cmd: 'create_enrollment' }, {
      dto: {
        courseId: course.id,
        userId: studentUser.firebaseId
      },
      user: adminUser
    });
    
    // 7. Progress & Analytics
    await testEndpoint({ cmd: 'get_instructor_dashboard' }, { user: adminUser });
    await testEndpoint({ cmd: 'get_my_dashboard' }, { user: studentUser });
  }

  console.log('\n--- TEST SUMMARY ---');
  console.table(results.map(r => ({ Command: r.cmd, Status: r.status })));
  
  const failures = results.filter(r => r.status === 'FAILURE');
  process.exit(failures.length > 0 ? 1 : 0);
}

runTests();
