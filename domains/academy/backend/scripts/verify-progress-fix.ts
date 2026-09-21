import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PrismaClient } from '../src/generated/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const HOST = '172.18.0.7'; // Container IP
const PORT = 3005;

async function verifyProgressFix() {
  const prisma = new PrismaClient();
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: HOST, port: PORT },
  });

  console.log(`Connecting to Academy Microservice at ${HOST}:${PORT}...`);

  const studentUserId = 'test-student-verify-' + Math.floor(Math.random() * 100000);
  const courseId = 2;
  const lessonId = 2;

  const testUser = {
    firebaseId: studentUserId,
    email: `${studentUserId}@example.com`,
    firstname: 'Test',
    lastname: 'Student',
    role: 'USER',
    globalRole: 'USER',
    status: 'ACTIVE',
  };

  try {
    // 1. Initialize Academy profile for the student
    console.log('\n--- 1. Initializing Academy Profile ---');
    console.log(`Creating profile for ${studentUserId}...`);
    await firstValueFrom(
      client.send({ cmd: 'get_academy_profile' }, { user: testUser })
    );

    console.log(`Selecting STUDENT role for ${studentUserId}...`);
    await firstValueFrom(
      client.send(
        { cmd: 'select_academy_role' },
        { userId: studentUserId, role: 'STUDENT', user: testUser }
      )
    );

    // Let's verify the profile created in the DB
    const profile = await prisma.academyProfile.findUnique({
      where: { userId: studentUserId },
    });
    console.log('Created Profile in DB:', JSON.stringify(profile, null, 2));

    // 2. Create course enrollment for the student
    console.log('\n--- 2. Creating Course Enrollment in DB ---');
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: studentUserId,
        courseId,
        status: 'ACTIVE',
        approvalStatus: 'APPROVED',
        paymentStatus: 'COMPLETED',
        enrollmentType: 'FREE',
        cohortRole: 'STUDENT',
        context: 'COURSE_ONLY',
        progress: 0,
      },
    });
    console.log('Enrollment created:', JSON.stringify(enrollment, null, 2));

    // 3. Fetch dashboard before completion
    console.log('\n--- 3. Checking dashboard progress before completion ---');
    let dashboard = await firstValueFrom(
      client.send({ cmd: 'get_my_dashboard' }, { user: testUser })
    );
    console.log('Dashboard response:', JSON.stringify(dashboard, null, 2));

    // 4. Complete lesson via microservice TCP command
    console.log('\n--- 4. Completing lesson via complete_lesson command ---');
    const completeResult = await firstValueFrom(
      client.send(
        { cmd: 'complete_lesson' },
        { courseId, lessonId, user: testUser }
      )
    );
    console.log('Lesson completion result:', JSON.stringify(completeResult, null, 2));

    // 5. Verify progress record was created correctly in DB
    console.log('\n--- 5. Verifying created progress record in database ---');
    const progressRecords = await prisma.progress.findMany({
      where: { userId: studentUserId, courseId },
    });
    console.log('Progress records in DB:', JSON.stringify(progressRecords, null, 2));

    if (progressRecords.length === 1 && progressRecords[0].contentId === null && progressRecords[0].status === 'COMPLETED') {
      console.log('✅ SUCCESS: Correct progress record created (contentId: null, status: COMPLETED)');
    } else {
      console.error('❌ FAILURE: Unexpected progress record(s) in DB');
    }

    // 6. Try completing the lesson again to check for idempotency / duplicates
    console.log('\n--- 6. Completing the same lesson again (idempotency check) ---');
    const completeAgainResult = await firstValueFrom(
      client.send(
        { cmd: 'complete_lesson' },
        { courseId, lessonId, user: testUser }
      )
    );
    console.log('Lesson completion again result:', JSON.stringify(completeAgainResult, null, 2));

    const progressRecordsAfter = await prisma.progress.findMany({
      where: { userId: studentUserId, courseId },
    });
    console.log('Progress records in DB after second call:', progressRecordsAfter.length);
    if (progressRecordsAfter.length === 1) {
      console.log('✅ SUCCESS: Calling complete_lesson again did not duplicate the progress record');
    } else {
      console.error('❌ FAILURE: Progress record was duplicated!');
    }

    // 7. Fetch dashboard after completion to see updated progress percentage
    console.log('\n--- 7. Checking dashboard progress after completion ---');
    dashboard = await firstValueFrom(
      client.send({ cmd: 'get_my_dashboard' }, { user: testUser })
    );
    console.log('Dashboard response after completion:', JSON.stringify(dashboard, null, 2));

    const targetCourse = dashboard.find((d: any) => d.courseId === courseId);
    if (targetCourse && targetCourse.percentage > 0) {
      console.log(`✅ SUCCESS: Progress percentage updated to ${targetCourse.percentage}%`);
    } else {
      console.error('❌ FAILURE: Progress percentage did not update');
    }

    // 8. Check student stats count
    console.log('\n--- 8. Checking student sidebar stats ---');
    const stats = await firstValueFrom(
      client.send({ cmd: 'get_student_stats' }, { user: testUser })
    );
    console.log('Student stats response:', JSON.stringify(stats, null, 2));
    if (stats.lessonsViewed === 1) {
      console.log('✅ SUCCESS: Sidebar lessonsViewed count is exactly 1 (ignores content progress records)');
    } else {
      console.error(`❌ FAILURE: Sidebar lessonsViewed count is ${stats.lessonsViewed}, expected 1`);
    }

    // Clean up our temporary test data
    console.log('\n--- Cleaning up temporary test data ---');
    await prisma.progress.deleteMany({ where: { userId: studentUserId } });
    await prisma.enrollment.deleteMany({ where: { userId: studentUserId } });
    await prisma.academyProfile.delete({ where: { userId: studentUserId } });
    console.log('Cleanup finished.');

  } catch (error) {
    console.error('❌ Verification failed with error:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

verifyProgressFix();
