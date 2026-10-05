import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = parseInt(process.env.PORT || '3005');

async function reproEnrollment() {
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: '172.18.0.8', port: PORT },
  });

  console.log(`Connecting to Academy Service on port ${PORT}...`);

  try {
    const user = {
      firebaseId: 'a3dnXAMTFTfiyx5lKQ0IA9RmDm13',
      email: 'test@gmail.com',
      globalRole: 'USER'
    };

    console.log('Triggering enrollment for Course 1...');
    const result = await firstValueFrom(client.send({ cmd: 'create_enrollment' }, {
      dto: {
        courseId: 1
      },
      user: user
    }));

    console.log('SUCCESS:', result);
  } catch (error) {
    console.error('FAILED with error:');
    console.error(JSON.stringify(error, null, 2));
    if (error.message) console.error('Message:', error.message);
  }

  process.exit(0);
}

reproEnrollment();
