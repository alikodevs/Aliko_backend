import { PrismaClient } from '../src/generated/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyGatewayComplete() {
  const prisma = new PrismaClient();
  const userId = 'test-admin-id';
  const courseId = 2;
  const lessonId = 2;

  try {
    console.log('--- 1. Making sure profile exists for test-admin-id ---');
    await prisma.academyProfile.upsert({
      where: { userId },
      update: { role: 'ADMIN' },
      create: { userId, role: 'ADMIN', hasSelectedRole: true },
    });

    console.log('--- 2. Enrolling test-admin-id in course 3 ---');
    // Delete existing enrollment/progress if any
    await prisma.progress.deleteMany({ where: { userId, courseId } });
    await prisma.enrollment.deleteMany({ where: { userId, courseId } });

    await prisma.enrollment.create({
      data: {
        userId,
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
    console.log('Enrollment created.');

    console.log('--- 3. Hitting Gateway complete-lesson endpoint via CURL ---');
    const curlCommand = `curl -s -w "\\n%{http_code}" -X POST "http://localhost:3006/academy/progress/course/${courseId}/lesson/${lessonId}/complete" -H "Authorization: Bearer debug-admin-token"`;
    console.log(`Executing: ${curlCommand}`);
    
    const output = execSync(curlCommand).toString().trim();
    console.log('CURL Response:\n' + output);

    const lines = output.split('\n');
    const httpCode = lines[lines.length - 1];
    
    if (httpCode === '200' || httpCode === '201') {
      console.log('✅ SUCCESS: Gateway endpoint returned HTTP ' + httpCode);
    } else {
      console.error('❌ FAILURE: Gateway endpoint returned HTTP ' + httpCode);
    }

    console.log('--- 4. Cleaning up test-admin-id data ---');
    await prisma.progress.deleteMany({ where: { userId } });
    await prisma.enrollment.deleteMany({ where: { userId } });
    await prisma.academyProfile.deleteMany({ where: { userId } });
    console.log('Cleanup complete.');

  } catch (error) {
    console.error('❌ Gateway verification failed:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

verifyGatewayComplete();
