#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootTs = path.resolve(__dirname, '../node_modules/typescript');
if (!fs.existsSync(rootTs)) process.exit(0);

function linkTypescript(nodeModulesDir) {
  const ts = path.join(nodeModulesDir, 'typescript');
  if (!fs.existsSync(ts)) return;
  if (path.resolve(ts) === rootTs) return;
  fs.rmSync(ts, { recursive: true, force: true });
  const rel = path.relative(nodeModulesDir, rootTs);
  fs.symlinkSync(rel, ts);
  console.log('typescript ->', rel, 'in', nodeModulesDir);
}

function walk(dir, depth = 0) {
  if (depth > 8) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (!e.isDirectory()) continue;
    if (e.name === 'node_modules') {
      linkTypescript(p);
      const nestCliNm = path.join(p, '@nestjs/cli/node_modules');
      if (fs.existsSync(nestCliNm)) linkTypescript(nestCliNm);
      continue;
    }
    if (e.name === '.git' || e.name === 'dist') continue;
    walk(p, depth + 1);
  }
}

walk(path.resolve(__dirname, '../domains'));
walk(path.resolve(__dirname, '../libraries'));
