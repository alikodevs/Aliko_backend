import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from '@aliko/config';
import { AppLoggerService } from '@aliko/logger';
import { ValidationPipe } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from '@aliko/common';
import express from 'express';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';

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

  // CA-07: Validate JWT when provided, while allowing direct browser static asset loads (images, PDFs, videos)
  const fileAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const reqPath = req.path || '';
    if (
      reqPath === '/health' ||
      reqPath === '/api/v1/health' ||
      reqPath.startsWith('/api/v1/health') ||
      reqPath.includes('/alikohub/images/') ||
      reqPath.includes('/alikohub/documents/') ||
      reqPath.includes('/alikohub/videos/') ||
      reqPath.startsWith('/images/')
    ) {
      return next();
    }

    const internalKey = req.headers['x-internal-service-key'];
    if (internalKey && process.env.INTERNAL_SERVICE_KEY && internalKey === process.env.INTERNAL_SERVICE_KEY) {
      return next();
    }

    const authHeader = req.headers.authorization;
    const queryToken = typeof req.query?.token === 'string' ? req.query.token : undefined;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : queryToken;

    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Authentication required to access protected files.' });
    }

    try {
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
      jwt.verify(token, secret);
      return next();
    } catch {
      return res.status(401).json({ statusCode: 401, message: 'Invalid or expired token.' });
    }
  };

  app.use('/uploads', fileAuthMiddleware, express.static(uploadPath, staticOptions));
  app.use('/api/v1/uploads', fileAuthMiddleware, express.static(uploadPath, staticOptions));
  app.use('/upload', fileAuthMiddleware, express.static(uploadPath, staticOptions));
  app.use('/api/v1/upload', fileAuthMiddleware, express.static(uploadPath, staticOptions));
  app.use(fileAuthMiddleware, express.static(uploadPath, staticOptions));

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  await app.listen(config.storageServicePort, '0.0.0.0');
  console.log(`📁 Storage Service running on port http://localhost:${config.storageServicePort}/api/v1`);
}
bootstrap();
