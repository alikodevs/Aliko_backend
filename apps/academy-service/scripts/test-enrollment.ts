import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = parseInt(process.env.PORT || '3005');

async function testEnrollment() {
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port: PORT },
  });

  console.log(`Testing enrollment creation...`);

  const adminUser = {
    firebaseId: 'test-user-admin-999',
    globalRole: 'ADMIN',
  };

  const studentUser = {
    firebaseId: 'test-user-student-999',
    globalRole: 'USER',
  };

  try {
    // Create profiles
    console.log('Creating admin profile...');
    await firstValueFrom(client.send({ cmd: 'get_academy_profile' }, { user: adminUser }));
    
    console.log('Creating student profile...');
    await firstValueFrom(client.send({ cmd: 'get_academy_profile' }, { user: studentUser }));
    await firstValueFrom(client.send({ cmd: 'select_academy_role' }, { userId: studentUser.firebaseId, role: 'STUDENT', user: studentUser }));

    // Create course
    console.log('Creating course...');
    const course = await firstValueFrom(client.send({ cmd: 'create_course' }, {
      dto: {
        title: 'Test Course ' + Date.now(),
        description: 'Test',
        price: 49,
        difficulty: 'BEGINNER',
        category: 'Test',
        learningOutcomes: ['Test'],
        requirements: ['None'],
        instructorId: adminUser.firebaseId
      },
      user: adminUser
    }));

    console.log('Course created:', course.id);

    // Publish course
    console.log('Publishing course...');
    await firstValueFrom(client.send({ cmd: 'update_course_status' }, { id: course.id, status: 'PUBLISHED', user: adminUser }));

    // Try enrollment with detailed error
    console.log('Creating enrollment...');
    console.log('Payload:', {
      dto: {
        courseId: course.id,
        userId: studentUser.firebaseId
      },
      user: adminUser
    });

    const enrollment = await firstValueFrom(client.send({ cmd: 'create_enrollment' }, {
      dto: {
        courseId: course.id,
        userId: studentUser.firebaseId
      },
      user: adminUser
    }));

    console.log('SUCCESS! Enrollment created:', enrollment);
  } catch (error) {
    console.error('DETAILED ERROR:');
    console.error('Message:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
  }

  process.exit(0);
}

testEnrollment();
