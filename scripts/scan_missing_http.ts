import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import * as fs from 'fs';
import * as path from 'path';

const controllersDir = path.resolve(__dirname, '../apps/academy-service/src');

function findControllerFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(findControllerFiles(full));
    } else if (file.endsWith('.controller.ts')) {
      results.push(full);
    }
  }
  return results;
}

const files = findControllerFiles(controllersDir);
console.log('Found', files.length, 'controller files\n');

for (const file of files) {
  try {
    const mod = require(file);
    for (const exp of Object.values(mod)) {
      if (typeof exp === 'function' && exp.prototype) {
        const proto = exp.prototype;
        const methods = Object.getOwnPropertyNames(proto).filter((m) => m !== 'constructor');
        const missingHttp: string[] = [];
        const hasHttp: string[] = [];
        for (const m of methods) {
          const rawMethod = Reflect.getMetadata(METHOD_METADATA, proto[m]);
          const pattern = Reflect.getMetadata('microservices:pattern', proto[m]);
          if (pattern !== undefined && rawMethod === undefined) {
            missingHttp.push(`${m} (TCP: ${JSON.stringify(pattern)})`);
          } else if (rawMethod !== undefined) {
            hasHttp.push(m);
          }
        }
        if (missingHttp.length > 0) {
          console.log(`Controller: ${exp.name} (${path.relative(process.cwd(), file)})`);
          console.log(`  HTTP active: ${hasHttp.length}`);
          console.log(`  TCP only (${missingHttp.length}):`);
          missingHttp.forEach((m) => console.log(`   - ${m}`));
          console.log('');
        }
      }
    }
  } catch (e: any) {
    console.error(`Error loading ${file}:`, e.message);
  }
}
