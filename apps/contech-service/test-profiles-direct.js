const { ClientProxyFactory, Transport } = require('@nestjs/microservices');
const { firstValueFrom } = require('rxjs');

async function testService(name, port, host, cmd, user) {
  console.log(`\n--- Testing ${name} Profile on ${host}:${port} ---`);
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host, port },
  });

  try {
    const result = await firstValueFrom(client.send({ cmd }, { user }));
    console.log(`✅ Success for ${name}:`);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.log(
      `❌ Failed for ${name} on ${host}:${port}: ${error.message || error}`,
    );
    throw error;
  } finally {
    await client.close();
  }
}

async function main() {
  const firebaseId = 'test-user-1766739641012';
  const testUser = {
    firebaseId: firebaseId,
    email: `${firebaseId}@example.com`,
    firstname: 'TestV2',
    lastname: 'User',
    role: 'USER',
    status: 'ACTIVE',
    globalRole: 'USER',
  };

  console.log('Testing Synchronization for USER:', firebaseId);

  // Con-Tech
  await testService(
    'Con-Tech',
    3002,
    'localhost',
    'get_contech_profile',
    testUser,
  ).catch(() => {});

  // Events (Try multiple variants)
  try {
    await testService(
      'Events',
      3003,
      '127.0.0.1',
      'get_events_profile',
      testUser,
    );
  } catch (e) {
    try {
      await testService(
        'Events',
        3003,
        'localhost',
        'get_events_profile',
        testUser,
      );
    } catch (e2) {
      await testService(
        'Events',
        3003,
        '::1',
        'get_events_profile',
        testUser,
      ).catch(() => {});
    }
  }

  // Academy
  await testService(
    'Academy',
    3005,
    'localhost',
    'get_academy_profile',
    testUser,
  ).catch(() => {});

  console.log('\n--- Verifying Auth Synchronization ---');
  const authClient = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: 'localhost', port: 3001 },
  });

  try {
    const user = await firstValueFrom(
      authClient.send(
        { cmd: 'get_user_profile' },
        { firebaseId: testUser.firebaseId },
      ),
    );
    console.log('Auth User Record (with domain flags):');
    const summary = {
      email: user.email,
      contechUser: user.contechUser ? 'Exists ✓' : 'Missing ✗',
      eventsUser: user.eventsUser ? 'Exists ✓' : 'Missing ✗',
      academyUser: user.academyUser ? 'Exists ✓' : 'Missing ✗',
    };
    console.log(JSON.stringify(summary, null, 2));

    if (user.contechUser && user.academyUser) {
      console.log('\n🌟 CORE SERVICES SYNCHRONIZED SUCCESSFULLY! 🌟');
    }
  } catch (error) {
    console.error('Auth check failed:', error.message);
  } finally {
    await authClient.close();
  }
}

main().catch(console.error);
