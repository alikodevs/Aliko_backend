import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from '@aliko/config';
import { AppLoggerService } from '@aliko/logger';
import { ValidationPipe } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from '@aliko/common';
import express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  const logger = app.get(AppLoggerService);
  logger.setServiceName('STORAGE-SERVICE');
  app.useLogger(logger);

  app.enableCors({
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, config.isOriginAllowed(requestOrigin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-internal-service-key', 'Origin'],
  });

  const uploadPath = path.resolve(config.localUploadDir || './uploads');
  const staticOptions = {
    setHeaders: (res: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  };
  app.use('/uploads', express.static(uploadPath, staticOptions));
  app.use('/api/v1/uploads', express.static(uploadPath, staticOptions));
  app.use(express.static(uploadPath, staticOptions));

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  await app.listen(config.storageServicePort, '0.0.0.0');
  console.log(`📁 Storage Service running on port http://localhost:${config.storageServicePort}/api/v1`);
}
bootstrap();
