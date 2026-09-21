import { PrismaClient } from '../src/generated/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SLEEP_MS = 2500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyIntegration() {
  const prisma = new PrismaClient();
  const userId = 'test-admin-id';
  const courseId = 2;
  const lessonId = 2;
  const txRef = 'test-ref-integration-12345';

  try {
    console.log('--- 1. Making sure profile exists for test-admin-id ---');
    await prisma.academyProfile.upsert({
      where: { userId },
      update: { role: 'ADMIN' },
      create: { userId, role: 'ADMIN', hasSelectedRole: true },
    });

    console.log('--- 2. Setting up pending enrollment for course 3 ---');
    // Delete existing enrollment/progress if any
    await prisma.progress.deleteMany({ where: { userId, courseId } });
    await prisma.enrollment.deleteMany({ where: { userId, courseId } });

    await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'PENDING',
        approvalStatus: 'APPROVED',
        paymentStatus: 'PENDING',
        enrollmentType: 'PAID',
        cohortRole: 'STUDENT',
        context: 'COURSE_ONLY',
        progress: 0,
      },
    });
    console.log('Pending enrollment created.');

    console.log('--- 3. Cleaning up and seeding pending transaction in payment schema ---');
    const pgContainer = execSync('docker ps --filter name=postgres --format "{{.Names}}"').toString().trim().split('\n')[0];
    if (!pgContainer) {
      throw new Error('Postgres container not found');
    }
    execSync(
      `docker exec ${pgContainer} psql -U alikohub -d alikohub_db -c "DELETE FROM payment.\\"Transaction\\" WHERE reference = '${txRef}';"`
    );
    
    // Insert pending transaction
    const insertSql = `INSERT INTO payment.\\"Transaction\\" (amount, currency, provider, status, reference, \\"userId\\", purpose, metadata, \\"createdAt\\", \\"updatedAt\\") VALUES (99.99, 'USD', 'STRIPE', 'PENDING', '${txRef}', '${userId}', 'COURSE_PURCHASE', '{\\"courseId\\": ${courseId}}', NOW(), NOW());`;
    execSync(`docker exec ${pgContainer} psql -U alikohub -d alikohub_db -c "${insertSql}"`);
    console.log('Pending transaction seeded directly in database.');

    console.log('--- 4. Hitting GET /payments/transactions/my ---');
    const myTxCurl = `curl -s -w "\\n%{http_code}" -X GET "http://localhost:3006/payments/transactions/my" -H "Authorization: Bearer debug-admin-token"`;
    console.log(`Executing: ${myTxCurl}`);
    const myTxOutput = execSync(myTxCurl).toString().trim();
    console.log('Response:\n' + myTxOutput);
    
    if (!myTxOutput.includes(txRef)) {
      throw new Error(`GET /payments/transactions/my did not return the seeded transaction reference ${txRef}`);
    }
    console.log('✅ GET /payments/transactions/my successfully returned the seeded transaction.');

    console.log('--- 5. Hitting GET /payments/transactions/all to find transaction ID ---');
    const allTxCurl = `curl -s -w "\\n%{http_code}" -X GET "http://localhost:3006/payments/transactions/all" -H "Authorization: Bearer debug-admin-token"`;
    const allTxOutput = execSync(allTxCurl).toString().trim();
    const allTxLines = allTxOutput.split('\n');
    const allTxHttpCode = allTxLines[allTxLines.length - 1];
    const allTxBody = allTxLines.slice(0, -1).join('\n');
    
    if (allTxHttpCode !== '200' && allTxHttpCode !== '201') {
      throw new Error(`GET /payments/transactions/all returned HTTP ${allTxHttpCode}`);
    }

    const transactions = JSON.parse(allTxBody);
    const targetTx = transactions.find((t: any) => t.reference === txRef);
    if (!targetTx) {
      throw new Error(`Seeded transaction not found in all transactions list`);
    }
    const txId = targetTx.id;
    console.log(`✅ Found transaction ID: ${txId}`);

    console.log('--- 6. Hitting PATCH /payments/transactions/:id/status to complete the transaction ---');
    const patchCurl = `curl -s -w "\\n%{http_code}" -X PATCH "http://localhost:3006/payments/transactions/${txId}/status" -H "Authorization: Bearer debug-admin-token" -H "Content-Type: application/json" -d '{"status":"COMPLETED"}'`;
    console.log(`Executing: ${patchCurl}`);
    const patchOutput = execSync(patchCurl).toString().trim();
    console.log('Response:\n' + patchOutput);
    const patchHttpCode = patchOutput.split('\n').pop();
    if (patchHttpCode !== '200' && patchHttpCode !== '201') {
      throw new Error(`PATCH status endpoint returned HTTP ${patchHttpCode}`);
    }
    console.log('✅ Transaction status patched to COMPLETED.');

    console.log(`--- 7. Waiting ${SLEEP_MS}ms for RabbitMQ event propagation and enrollment processing ---`);
    await sleep(SLEEP_MS);

    console.log('--- 8. Verifying enrollment is activated in database ---');
    const updatedEnrollment = await prisma.enrollment.findFirst({
      where: { userId, courseId },
    });
    console.log('Current enrollment state in DB:', updatedEnrollment);
    if (!updatedEnrollment || updatedEnrollment.status !== 'ACTIVE' || updatedEnrollment.paymentStatus !== 'COMPLETED') {
      throw new Error('Enrollment was NOT successfully completed and activated!');
    }
    console.log('✅ Enrollment was successfully activated (paymentStatus = COMPLETED, status = ACTIVE).');

    console.log('--- 9. Verifying GET progress status (initially not completed) ---');
    const getStatusCurl = `curl -s -w "\\n%{http_code}" -X GET "http://localhost:3006/academy/progress/course/${courseId}/lesson/${lessonId}/complete" -H "Authorization: Bearer debug-admin-token"`;
    console.log(`Executing: ${getStatusCurl}`);
    const statusOutput = execSync(getStatusCurl).toString().trim();
    console.log('Response:\n' + statusOutput);
    const statusLines = statusOutput.split('\n');
    const statusHttpCode = statusLines[statusLines.length - 1];
    const statusBody = JSON.parse(statusLines.slice(0, -1).join('\n'));
    if (statusHttpCode !== '200' && statusHttpCode !== '201') {
      throw new Error(`GET progress status returned HTTP ${statusHttpCode}`);
    }
    if (statusBody.completed !== false) {
      throw new Error('Expected completed to be false initially');
    }
    console.log('✅ GET progress status returned completed = false initially.');

    console.log('--- 10. Completing lesson via POST ---');
    const completeCurl = `curl -s -w "\\n%{http_code}" -X POST "http://localhost:3006/academy/progress/course/${courseId}/lesson/${lessonId}/complete" -H "Authorization: Bearer debug-admin-token"`;
    console.log(`Executing: ${completeCurl}`);
    const completeOutput = execSync(completeCurl).toString().trim();
    console.log('Response:\n' + completeOutput);
    const completeHttpCode = completeOutput.split('\n').pop();
    if (completeHttpCode !== '200' && completeHttpCode !== '201') {
      throw new Error(`POST complete lesson returned HTTP ${completeHttpCode}`);
    }
    console.log('✅ Lesson completed successfully.');

    console.log('--- 11. Verifying GET progress status again (now completed) ---');
    const statusOutput2 = execSync(getStatusCurl).toString().trim();
    console.log('Response:\n' + statusOutput2);
    const statusLines2 = statusOutput2.split('\n');
    const statusHttpCode2 = statusLines2[statusLines2.length - 1];
    const statusBody2 = JSON.parse(statusLines2.slice(0, -1).join('\n'));
    if (statusHttpCode2 !== '200' && statusHttpCode2 !== '201') {
      throw new Error(`GET progress status returned HTTP ${statusHttpCode2}`);
    }
    if (statusBody2.completed !== true) {
      throw new Error('Expected completed to be true after POST complete');
    }
    console.log('✅ GET progress status returned completed = true.');

    console.log('🎉🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉🎉');

  } catch (error: any) {
    console.error('❌ Integration verification failed:', error.message || error);
    process.exit(1);
  } finally {
    console.log('--- 12. Cleaning up test data ---');
    try {
      await prisma.progress.deleteMany({ where: { userId } });
      await prisma.enrollment.deleteMany({ where: { userId } });
      await prisma.academyProfile.deleteMany({ where: { userId } });
      const pgContainerClean = execSync('docker ps --filter name=postgres --format "{{.Names}}"').toString().trim().split('\n')[0];
      if (pgContainerClean) {
        execSync(`docker exec ${pgContainerClean} psql -U alikohub -d alikohub_db -c "DELETE FROM payment.\\"Transaction\\" WHERE reference = '${txRef}';"`).toString();
      }
      console.log('Cleanup finished.');
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr);
    }
    await prisma.$disconnect();
    process.exit(0);
  }
}

verifyIntegration();
