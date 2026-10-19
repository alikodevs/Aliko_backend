const fs = require('fs');
const path = require('path');

const mappings = [
  { dir: path.join(__dirname, '../apps/events-service'), pkg: '@prisma/client/events' },
  { dir: path.join(__dirname, '../apps/careers-service'), pkg: '@prisma/client/careers' },
  { dir: path.join(__dirname, '../apps/financial-service'), pkg: '@prisma/client/financial' },
  { dir: path.join(__dirname, '../apps/academy-service'), pkg: '@prisma/client/academy' },
  { dir: path.join(__dirname, '../apps/user-service'), pkg: '@prisma/client/user' },
  { dir: path.join(__dirname, '../apps/contech-service'), pkg: '@prisma/client/contech' },
];

function processDir(dir, pkg) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      processDir(fullPath, pkg);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const updated = content.replace(/from\s+['"][^'"]*generated\/client['"]/g, `from '${pkg}'`);
      if (content !== updated) {
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log(`Updated: ${fullPath} -> ${pkg}`);
      }
    }
  }
}

for (const m of mappings) {
  processDir(m.dir, m.pkg);
}
console.log('All Prisma imports updated successfully.');
