const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'api-gateway', path: './dist/apps/api-gateway/apps/api-gateway/src/main.js', port: 3000 },
  { name: 'user-service', path: './dist/apps/user-service/apps/user-service/src/main.js', port: 3001 },
  { name: 'academy-service', path: './dist/apps/academy-service/apps/academy-service/src/main.js', port: 3002 },
  { name: 'contech-service', path: './dist/apps/contech-service/apps/contech-service/src/main.js', port: 3003 },
  { name: 'events-service', path: './dist/apps/events-service/apps/events-service/src/main.js', port: 3004 },
  { name: 'careers-service', path: './dist/apps/careers-service/apps/careers-service/src/main.js', port: 3005 },
  { name: 'financial-service', path: './dist/apps/financial-service/apps/financial-service/src/main.js', port: 3006 },
  { name: 'communication-service', path: './dist/apps/communication-service/apps/communication-service/src/main.js', port: 3007 },
  { name: 'storage-service', path: './dist/apps/storage-service/apps/storage-service/src/main.js', port: 3008 },
];

console.log('Checking built artifacts exist...');
const fs = require('fs');
let allExist = true;
for (const s of services) {
  const full = path.resolve(__dirname, '..', s.path);
  const exists = fs.existsSync(full);
  console.log(`  [${s.name.padEnd(23)}] -> ${exists ? 'EXISTS' : 'MISSING'} (${s.path})`);
  if (!exists) allExist = false;
}

if (!allExist) {
  console.error('Some built artifacts are missing!');
  process.exit(1);
}

console.log('\nAll 9 compiled production bundles exist and are ready for deployment.');
