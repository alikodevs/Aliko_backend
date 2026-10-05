const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.controller.ts')) {
      results.push(file);
    }
  });
  return results;
}

const controllers = walk('apps/academy-service/src');
const patterns = [];
for (const file of controllers) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = [...content.matchAll(/@MessagePattern\(([\s\S]*?)\)/g)];
  for (const m of matches) {
    patterns.push({
      file: path.relative('apps/academy-service/src', file),
      pattern: m[1].replace(/\s+/g, ' ').trim()
    });
  }
}
console.log('Total patterns found:', patterns.length);
patterns.forEach(p => console.log(p.file, '->', p.pattern));
