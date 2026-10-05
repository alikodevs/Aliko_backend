import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../core-platform-services/auth-service/.env') });

const AUTH_PORT = parseInt(process.env.AUTH_SERVICE_PORT || '3001');

async function testAuthService() {
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port: AUTH_PORT },
  });

  console.log(`Testing auth service on port ${AUTH_PORT}...`);

  const testUserId = 'test-user-student-999';

  try {
    console.log(`\nLooking up user: ${testUserId}`);
    const user = await firstValueFrom(
      client.send({ cmd: 'get_user_profile' }, { firebaseId: testUserId })
    );
    console.log('User found:', user);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Details:', error);
  }

  process.exit(0);
}

testAuthService();
