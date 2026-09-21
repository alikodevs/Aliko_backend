#!/usr/bin/env node
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scripts = ['link-typescript.cjs', 'link-alikohub-libs.cjs'];

for (const name of scripts) {
  const file = path.join(root, 'scripts', name);
  if (!fs.existsSync(file)) continue;
  execFileSync(process.execPath, [file], { stdio: 'inherit', cwd: root });
}
