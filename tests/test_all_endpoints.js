/**
 * Comprehensive Endpoint Verification Suite
 * Tests every microservice directly and through the API Gateway.
 */

const services = [
  { name: 'API Gateway', port: 3000, url: 'http://localhost:3000' },
  { name: 'User Service', port: 3001, url: 'http://localhost:3001' },
  { name: 'Academy Service', port: 3002, url: 'http://localhost:3002' },
  { name: 'ConTech Service', port: 3003, url: 'http://localhost:3003' },
  { name: 'Events Service', port: 3004, url: 'http://localhost:3004' },
  { name: 'Careers Service', port: 3005, url: 'http://localhost:3005' },
  { name: 'Financial Service', port: 3006, url: 'http://localhost:3006' },
  { name: 'Communication Service', port: 3007, url: 'http://localhost:3007' },
  { name: 'Storage Service', port: 3008, url: 'http://localhost:3008' },
];

async function checkUrl(url, method = 'GET', expectedStatuses = [200, 201]) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method,
      signal: AbortSignal.timeout(4000),
    });
    const latency = Date.now() - start;
    const ok = expectedStatuses.includes(res.status);
    return { ok, status: res.status, latency };
  } catch (err) {
    return { ok: false, status: `OFFLINE (${err.message})`, latency: Date.now() - start };
  }
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('   🔍 1. DIRECT MICROSERVICE HEALTH & OBSERVABILITY PROBES              ');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  for (const svc of services) {
    total++;
    const healthUrl = `${svc.url}/api/v1/health`;
    const res = await checkUrl(healthUrl);
    const statusStr = res.ok
      ? `\x1b[32m✔ UP (${res.status})\x1b[0m`
      : `\x1b[31m✖ FAIL (${res.status})\x1b[0m`;

    if (res.ok) passed++;
    console.log(
      `  [${svc.name.padEnd(23)}] -> ${statusStr.padEnd(25)} (Latency: ${res.latency}ms)`
    );
  }

  console.log('\n========================================================================');
  console.log('   🌐 2. API GATEWAY REVERSE PROXY ROUTING PROBES                       ');
  console.log('========================================================================\n');

  const gatewayRoutes = [
    { name: 'Swagger API Docs', url: 'http://localhost:3000/api/docs', statuses: [200, 301, 302] },
    { name: 'Gateway Health', url: 'http://localhost:3000/api/v1/health', statuses: [200] },
    { name: 'Gateway Prometheus Metrics', url: 'http://localhost:3000/api/v1/metrics', statuses: [200] },
    { name: 'Proxy -> User RBAC Public', url: 'http://localhost:3000/api/v1/rbac/public', statuses: [200, 404] },
    { name: 'Proxy -> Academy Service', url: 'http://localhost:3000/api/v1/academy/health', statuses: [200] },
    { name: 'Proxy -> ConTech Service', url: 'http://localhost:3000/api/v1/contech/health', statuses: [200] },
    { name: 'Proxy -> Events Service', url: 'http://localhost:3000/api/v1/events/health', statuses: [200] },
    { name: 'Proxy -> Careers Service', url: 'http://localhost:3000/api/v1/careers/health', statuses: [200] },
    { name: 'Proxy -> Financial Service', url: 'http://localhost:3000/api/v1/financial/health', statuses: [200] },
    { name: 'Proxy -> Communication Service', url: 'http://localhost:3000/api/v1/communication/health', statuses: [200] },
    { name: 'Proxy -> Storage Service', url: 'http://localhost:3000/api/v1/storage/health', statuses: [200] },
  ];

  for (const route of gatewayRoutes) {
    total++;
    const res = await checkUrl(route.url, 'GET', route.statuses);
    const statusStr = res.ok
      ? `\x1b[32m✔ OK (${res.status})\x1b[0m`
      : `\x1b[31m✖ FAIL (${res.status})\x1b[0m`;

    if (res.ok) passed++;
    console.log(
      `  [${route.name.padEnd(30)}] -> ${statusStr.padEnd(25)} (Latency: ${res.latency}ms)`
    );
  }

  console.log('\n========================================================================');
  console.log('   🎯 3. FUNCTIONAL DOMAIN ENDPOINTS                                   ');
  console.log('========================================================================\n');

  const domainEndpoints = [
    { name: 'User Service RBAC Public', url: 'http://localhost:3001/api/v1/rbac/public', statuses: [200] },
    { name: 'Careers Service Jobs List', url: 'http://localhost:3005/api/v1', statuses: [200, 404] },
    { name: 'Storage Service Files Route', url: 'http://localhost:3008/api/v1/files/upload', method: 'POST', statuses: [400, 200, 201] },
  ];

  for (const ep of domainEndpoints) {
    total++;
    const res = await checkUrl(ep.url, ep.method || 'GET', ep.statuses);
    const statusStr = res.ok
      ? `\x1b[32m✔ RESPONDED (${res.status})\x1b[0m`
      : `\x1b[31m✖ FAIL (${res.status})\x1b[0m`;

    if (res.ok) passed++;
    console.log(
      `  [${ep.name.padEnd(30)}] -> ${statusStr.padEnd(25)} (Latency: ${res.latency}ms)`
    );
  }

  console.log('\n========================================================================');
  const summaryColor = passed === total ? '\x1b[32m' : '\x1b[33m';
  console.log(`   ${summaryColor}SUMMARY: ${passed} / ${total} Endpoint Checks Succeeded\x1b[0m`);
  console.log('========================================================================\n');
}

runTests().catch(console.error);
