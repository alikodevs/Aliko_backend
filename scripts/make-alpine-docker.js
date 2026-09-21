import fs from 'fs';
import path from 'path';

const files = [
  'domains/academy/backend/Dockerfile',
  'domains/alikowash/backend/Dockerfile',
  'domains/events/backend/Dockerfile',
  'domains/core-platform-services/file-upload-service/Dockerfile',
  'domains/core-platform-services/careers-service/backend/Dockerfile',
  'domains/core-platform-services/payment-service/Dockerfile',
  'domains/core-platform-services/auth-service/Dockerfile',
  'domains/consultancy/backend/Dockerfile',
  'domains/con-tech/backend/Dockerfile',
  'domains/conshifter/backend/Dockerfile'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  
  // Switch to Alpine Images
  content = content.replace(/FROM node:22 AS build.*/g, 'FROM node:22-alpine AS builder');
  content = content.replace(/FROM node:22-slim/g, 'FROM node:22-alpine');
  
  // Replace apt-get with apk add --no-cache
  content = content.replace(/RUN apt-get.*?openssl.*?(?=\n)/g, 'RUN apk add --no-cache openssl curl procps libc6-compat');

  // Some dockers might have multiple apt-get lines, just doing a blanket regex if the first failed
  if (content.includes('apt-get')) {
    content = content.replace(/RUN apt-get.+/g, 'RUN apk add --no-cache openssl curl procps libc6-compat');
  }

  // Remove duplicate npx prisma generate lines if they were added erroneously by the first pass
  let lines = content.split('\n');
  let newLines = [];
  let installOmitDevMode = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    newLines.push(line);
  }
  
  content = newLines.join('\n');
  fs.writeFileSync(f, content);
  console.log('Alpine optimized: ' + f);
});
