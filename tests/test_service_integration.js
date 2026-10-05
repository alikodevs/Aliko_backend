/**
 * Peer Service-to-Service Integration Test
 * Verifies direct HTTP calls using x-internal-service-key peer authentication.
 */

const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'aliko-internal-secret-change-in-production';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001/api/v1';

async function testInternalKeyBypass() {
  console.log('\n--- 1. Testing x-internal-service-key Peer Auth Bypass ---');
  try {
    const res = await fetch(`${USER_SERVICE_URL}/rbac/admin`, {
      headers: {
        'Accept': 'application/json',
        'x-internal-service-key': INTERNAL_SECRET,
      },
      signal: AbortSignal.timeout(3000),
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    if (res.status === 200) {
      const data = await res.json();
      console.log(`✔ Internal service key accepted: "${data.message}"`);
    } else {
      console.error(`❌ Unexpected response: ${res.status}`);
    }
  } catch (err) {
    console.warn(`User Service is offline (${err.message}).`);
  }
}

async function testInvalidKeyRejection() {
  console.log('\n--- 2. Testing Invalid Internal Service Key Rejection ---');
  try {
    const res = await fetch(`${USER_SERVICE_URL}/rbac/admin`, {
      headers: {
        'Accept': 'application/json',
        'x-internal-service-key': 'wrong-fake-key-12345',
      },
      signal: AbortSignal.timeout(3000),
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    if (res.status === 401 || res.status === 403) {
      console.log('✔ Invalid internal key was correctly rejected with 401/403.');
    } else {
      console.warn(`Unexpected response status for invalid key: ${res.status}`);
    }
  } catch (err) {
    console.warn(`User Service is offline (${err.message}).`);
  }
}

async function main() {
  console.log('========================================================================');
  console.log('   🔗 RUNNING PEER SERVICE INTEGRATION & AUTH TESTS                    ');
  console.log('========================================================================');
  await testInternalKeyBypass();
  await testInvalidKeyRejection();
  console.log('\n========================================================================\n');
}

main().catch(console.error);
