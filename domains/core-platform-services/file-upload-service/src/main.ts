import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { winstonConfig } from './winston.config';

import express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,
  });
  
  // Enable CORS
  app.enableCors();

  const uploadPath = path.resolve(process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'));
  app.use('/uploads', express.static(uploadPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.jfif')) {
        res.setHeader('Content-Type', 'image/jpeg');
      }
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      }
    }
  }));

  const port = process.env.PORT || 3010;
  // Connect TCP microservice
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3019,
    },
  });

  await app.startAllMicroservices();
  await app.listen(port);
}
bootstrap();
