/**
 * End-to-end verification script for CORS, Helmet COOP, and Auth routing.
 */
async function test() {
  console.log('Testing Endpoints & CORS Headers...\n');

  // Test 1: OPTIONS preflight on api.consultancy.alikohub.com via Nginx
  try {
    const res = await fetch('https://api.consultancy.alikohub.com/auth/login/google', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://lms.alikohub.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    console.log('[Test 1] OPTIONS https://api.consultancy.alikohub.com/auth/login/google');
    console.log('  Status:', res.status);
    console.log('  Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
    console.log('  Access-Control-Allow-Credentials:', res.headers.get('access-control-allow-credentials'));
    console.log('  Cross-Origin-Opener-Policy:', res.headers.get('cross-origin-opener-policy'));
  } catch (e) {
    console.error('[Test 1 Error]:', e.message);
  }

  console.log('\n---');

  // Test 2: OPTIONS preflight on api.consultancy.alikohub.com/api/v1/auth/login/google
  try {
    const res = await fetch('https://api.consultancy.alikohub.com/api/v1/auth/login/google', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://lms.alikohub.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    console.log('[Test 2] OPTIONS https://api.consultancy.alikohub.com/api/v1/auth/login/google');
    console.log('  Status:', res.status);
    console.log('  Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
    console.log('  Cross-Origin-Opener-Policy:', res.headers.get('cross-origin-opener-policy'));
  } catch (e) {
    console.error('[Test 2 Error]:', e.message);
  }

  console.log('\n---');

  // Test 3: POST /auth/login/google (Verify proxying to user-service without hang)
  try {
    const res = await fetch('https://api.consultancy.alikohub.com/auth/login/google', {
      method: 'POST',
      headers: {
        'Origin': 'https://lms.alikohub.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: 'dummy_token_for_verification' }),
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => null);
    console.log('[Test 3] POST https://api.consultancy.alikohub.com/auth/login/google');
    console.log('  Status:', res.status);
    console.log('  Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
    console.log('  Cross-Origin-Opener-Policy:', res.headers.get('cross-origin-opener-policy'));
    console.log('  Body:', body);
  } catch (e) {
    console.error('[Test 3 Error]:', e.message);
  }

  console.log('\n---');

  // Test 4: GET /api/v1/academy/health via Nginx
  try {
    const res = await fetch('https://api.consultancy.alikohub.com/api/v1/academy/health', {
      method: 'GET',
      headers: {
        'Origin': 'https://lms.alikohub.com',
      },
    });
    const body = await res.json().catch(() => null);
    console.log('[Test 4] GET https://api.consultancy.alikohub.com/api/v1/academy/health');
    console.log('  Status:', res.status);
    console.log('  Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
    console.log('  Body:', body);
  } catch (e) {
    console.error('[Test 4 Error]:', e.message);
  }

  console.log('\n---');

  // Test 5: Verify other sites (alikorerp and tebeka) are intact
  try {
    const res1 = await fetch('http://127.0.0.1:5000/api/v1/health', { signal: AbortSignal.timeout(3000) }).catch(() => null);
    const res2 = await fetch('http://127.0.0.1:7000/api/v1/health', { signal: AbortSignal.timeout(3000) }).catch(() => null);
    console.log('[Test 5] Checking other projects:');
    console.log('  Alikore ERP (port 5000):', res1 ? res1.status : 'offline/unreachable');
    console.log('  Tebeka (port 7000):', res2 ? res2.status : 'offline/unreachable');
  } catch (e) {
    console.error('[Test 5 Error]:', e.message);
  }
}

test();
