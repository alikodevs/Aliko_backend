#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const rootTs = path.resolve(__dirname, '../node_modules/typescript');
if (!fs.existsSync(rootTs)) process.exit(0);
function walk(dir, depth=0) {
  if (depth > 6) return;
  let entries=[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') {
        const ts = path.join(p, 'typescript');
        if (fs.existsSync(ts) && path.resolve(ts) !== rootTs) {
          fs.rmSync(ts, { recursive: true, force: true });
          const rel = path.relative(p, rootTs);
          fs.symlinkSync(rel, ts);
          console.log('typescript ->', rel, 'in', p);
        }
        // do not recurse into nested node_modules except @nestjs/cli
        const nestCli = path.join(p, '@nestjs/cli/node_modules');
        if (fs.existsSync(nestCli)) walk(nestCli, depth+1);
      } else if (e.name !== '.git') {
        walk(p, depth+1);
      }
    }
  }
}
walk(path.resolve(__dirname, '../domains'));
walk(path.resolve(__dirname, '../libraries'));
