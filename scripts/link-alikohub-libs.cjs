#!/usr/bin/env node
/**
 * Ensure every Nest service can resolve @alikohub/* packages in its local node_modules
 * (needed for IDE language service; npm workspaces only hoist to the repo root).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const libsDir = path.join(root, 'libraries');
const services = [
  'domains/academy/backend',
  'domains/events/backend',
  'domains/con-tech/backend',
  'domains/conshifter/backend',
  'domains/consultancy/backend',
  'domains/alikowash/backend',
  'domains/core-platform-services/api-gateway-service',
  'domains/core-platform-services/auth-service',
  'domains/core-platform-services/file-upload-service',
  'domains/core-platform-services/payment-service',
  'domains/core-platform-services/careers-service/backend',
];

const libs = fs
  .readdirSync(libsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const pkgPath = path.join(libsDir, d.name, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg.name || !pkg.name.startsWith('@alikohub/')) return null;
    return { dir: d.name, name: pkg.name };
  })
  .filter(Boolean);

for (const svc of services) {
  const scopeDir = path.join(root, svc, 'node_modules', '@alikohub');
  if (fs.existsSync(scopeDir) && fs.lstatSync(scopeDir).isSymbolicLink()) {
    fs.unlinkSync(scopeDir);
  }
  fs.mkdirSync(scopeDir, { recursive: true });

  for (const lib of libs) {
    const short = lib.name.replace('@alikohub/', '');
    const dest = path.join(scopeDir, short);
    const src = path.join(libsDir, lib.dir);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.symlinkSync(path.relative(scopeDir, src), dest);
  }
  console.log('linked @alikohub libs into', svc);
}
