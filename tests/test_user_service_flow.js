const { ClientProxyFactory, Transport } = require('@nestjs/microservices');
const { firstValueFrom, timeout } = require('rxjs');

const TCP_PORT = parseInt(process.env.AUTH_TCP_PORT || process.env.USER_TCP_PORT || '3011', 10);
const HTTP_PORT = 3001;
const GATEWAY_PORT = 3000;
const HOST = '127.0.0.1';

const client = ClientProxyFactory.create({
  transport: Transport.TCP,
  options: { host: HOST, port: TCP_PORT },
});

const rand = Math.floor(1000 + Math.random() * 9000);
const testUserEmail = `user.test.${rand}@example.com`;
const testPassword = 'Password123!';
let createdUserId = null;
let authToken = null;

const results = [];

async function callTcp(cmd, payload, desc) {
  process.stdout.write(`  ▶ [TCP]  ${desc.padEnd(52)} ... `);
  try {
    const obs = client.send(cmd, payload).pipe(timeout(8000));
    const res = await firstValueFrom(obs);
    console.log('\x1b[32m✔ OK\x1b[0m');
    results.push({ name: desc, channel: 'TCP', pass: true });
    return res;
  } catch (err) {
    console.log(`\x1b[31m✖ FAIL (${err?.message || err})\x1b[0m`);
    results.push({ name: desc, channel: 'TCP', pass: false, error: err?.message || err });
    return null;
  }
}

async function callHttp(url, options, desc, expectedStatuses = [200, 201]) {
  process.stdout.write(`  ▶ [HTTP] ${desc.padEnd(52)} ... `);
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
    const ok = expectedStatuses.includes(res.status);
    let body;
    try { body = await res.json(); } catch (_) { body = null; }

    if (ok) {
      console.log(`\x1b[32m✔ OK (${res.status})\x1b[0m`);
      results.push({ name: desc, channel: 'HTTP', pass: true });
      return body;
    } else {
      console.log(`\x1b[31m✖ FAIL (${res.status})\x1b[0m - ${JSON.stringify(body || '')}`);
      results.push({ name: desc, channel: 'HTTP', pass: false, error: `Status ${res.status}` });
      return null;
    }
  } catch (err) {
    console.log(`\x1b[31m✖ FAIL (${err.message})\x1b[0m`);
    results.push({ name: desc, channel: 'HTTP', pass: false, error: err.message });
    return null;
  }
}

async function run() {
  console.log('\n========================================================================');
  console.log('   👤 USER & AUTH SERVICE: COMPREHENSIVE ENDPOINT & FLOW VERIFICATION   ');
  console.log(`   TCP Port: ${TCP_PORT} | HTTP Port: ${HTTP_PORT} | Gateway: ${GATEWAY_PORT}`);
  console.log('========================================================================\n');

  console.log('[SECTION 1] Microservice TCP Message Patterns');
  await callTcp({ cmd: 'health_check' }, {}, 'User Service TCP Health Check');

  const regRes = await callTcp({ cmd: 'register' }, {
    email: testUserEmail,
    password: testPassword,
    firstname: 'Test',
    lastname: 'SuiteUser',
    role: 'USER',
  }, 'Register new user account');

  if (regRes) {
    createdUserId = regRes.user?.firebaseId || regRes.firebaseId;
  }

  const loginRes = await callTcp({ cmd: 'login' }, {
    email: testUserEmail,
    password: testPassword,
  }, 'Login with user credentials');

  if (loginRes && (loginRes.token || loginRes.accessToken)) {
    authToken = loginRes.token || loginRes.accessToken;
  }

  if (createdUserId) {
    await callTcp({ cmd: 'get_user_profile' }, {
      firebaseId: createdUserId,
    }, 'Get user profile by firebaseId');

    await callTcp({ cmd: 'update_user_profile' }, {
      firebaseId: createdUserId,
      dto: { firstname: 'UpdatedTestName' },
    }, 'Update user profile details');

    await callTcp({ cmd: 'get_users_by_ids' }, {
      userIds: [createdUserId],
    }, 'Batch query users by IDs');

    await callTcp({ cmd: 'select_academy_role' }, {
      userId: createdUserId,
      role: 'STUDENT',
    }, 'Select Academy student role');

    await callTcp({ cmd: 'get_user_academy_status' }, {
      userId: createdUserId,
    }, 'Get user Academy status');

    await callTcp({ cmd: 'apply_teacher_role' }, {
      userId: createdUserId,
      personalDetails: { phone: '+1234567890' },
      teachingCategories: ['Healthcare', 'Nursing'],
      resumeUrl: 'https://example.com/resumes/test_resume.pdf',
      interviewResponses: { experience: '5 years' },
      documents: ['https://example.com/docs/cna_cert.pdf'],
    }, 'Submit Academy teacher/instructor application');

    await callTcp({ cmd: 'get_teacher_applications' }, {
      requestingUserRole: 'ADMIN',
    }, 'List teacher applications (Admin)');

    await callTcp({ cmd: 'sync_academy_user' }, {
      userId: createdUserId,
    }, 'Sync user with Academy domain');

    await callTcp({ cmd: 'sync_contech_user' }, {
      userId: createdUserId,
    }, 'Sync user with ConTech domain');

    await callTcp({ cmd: 'sync_careers_user' }, {
      userId: createdUserId,
    }, 'Sync user with Careers domain');

    await callTcp({ cmd: 'sync_events_user' }, {
      userId: createdUserId,
    }, 'Sync user with Events domain');
  }

  await callTcp({ cmd: 'get_all_users' }, {}, 'Fetch all users list');

  console.log('\n[SECTION 2] Direct User Service HTTP REST Endpoints (Port 3001)');
  await callHttp(`http://${HOST}:${HTTP_PORT}/api/v1/health`, { method: 'GET' }, 'GET /api/v1/health (Auth Health Check)');
  await callHttp(`http://${HOST}:${HTTP_PORT}/api/v1/rbac/public`, { method: 'GET' }, 'GET /api/v1/rbac/public');

  if (createdUserId) {
    await callHttp(`http://${HOST}:${HTTP_PORT}/api/v1/academy/status/${createdUserId}`, { method: 'GET' }, `GET /api/v1/academy/status/:userId`);
  }

  const httpLoginUserEmail = `http.user.${rand}@example.com`;
  await callHttp(`http://${HOST}:${HTTP_PORT}/api/v1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: httpLoginUserEmail,
      password: testPassword,
      firstname: 'HttpUser',
      lastname: 'Direct',
      role: 'USER',
    }),
  }, 'POST /api/v1/register');

  const httpLoginRes = await callHttp(`http://${HOST}:${HTTP_PORT}/api/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: httpLoginUserEmail,
      password: testPassword,
    }),
  }, 'POST /api/v1/login');

  const directToken = httpLoginRes?.token || httpLoginRes?.accessToken;
  if (directToken) {
    await callHttp(`http://${HOST}:${HTTP_PORT}/api/v1/profile`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${directToken}` },
    }, 'GET /api/v1/profile with Bearer token');
  }

  console.log('\n[SECTION 3] API Gateway Reverse Proxy Routing to User Service (Port 3000)');
  await callHttp(`http://${HOST}:${GATEWAY_PORT}/api/v1/rbac/public`, { method: 'GET' }, 'Gateway Proxy -> /api/v1/rbac/public');

  const gwLoginEmail = `gw.user.${rand}@example.com`;
  await callHttp(`http://${HOST}:${GATEWAY_PORT}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: gwLoginEmail,
      password: testPassword,
      firstname: 'GatewayUser',
      lastname: 'Proxy',
      role: 'USER',
    }),
  }, 'Gateway Proxy -> POST /api/v1/auth/register');

  const gwLoginRes = await callHttp(`http://${HOST}:${GATEWAY_PORT}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: gwLoginEmail,
      password: testPassword,
    }),
  }, 'Gateway Proxy -> POST /api/v1/auth/login');

  const gwToken = gwLoginRes?.token || gwLoginRes?.accessToken;
  if (gwToken) {
    await callHttp(`http://${HOST}:${GATEWAY_PORT}/api/v1/users/profile`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${gwToken}` },
    }, 'Gateway Proxy -> GET /api/v1/users/profile');
  }

  console.log('\n[SECTION 4] Teardown & Account Cleanup');
  if (createdUserId) {
    await callTcp({ cmd: 'delete_user_profile' }, {
      firebaseId: createdUserId,
    }, 'Teardown test user account');
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log('\n========================================================================');
  console.log('  📊 USER SERVICE ENDPOINT VERIFICATION SUMMARY');
  console.log('========================================================================');
  console.log(`  Total Endpoints Tested: ${results.length}`);
  console.log(`  Passed:                 ${passed}`);
  console.log(`  Failed:                 ${failed}`);
  console.log(`  Pass Rate:              ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
