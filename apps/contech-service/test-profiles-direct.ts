import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

async function testService(name: string, port: number, cmd: string, user: any) {
  console.log(`\n--- Testing ${name} Profile ---`);
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port },
  });

  try {
    const result = await firstValueFrom(client.send({ cmd }, { user }));
    console.log(`Success for ${name}:`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error for ${name}:`, error.message);
  } finally {
    await client.close();
  }
}

async function main() {
  const testUser = {
    firebaseId: 'AeeEagpkA8TV3pWdsb0BySb7V1t2',
    email: 'studen1222t@example.com',
    firstname: 'stu',
    lastname: 'Dose',
    role: 'USER',
    status: 'ACTIVE',
    globalRole: 'USER',
  };

  await testService('Con-Tech', 3002, 'get_contech_profile', testUser);
  await testService('Events', 3003, 'get_events_profile', testUser);
  await testService('Academy', 3005, 'get_academy_profile', testUser);
}

main().catch(console.error);
