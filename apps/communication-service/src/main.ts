import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from '@aliko/config';
import { AppLoggerService } from '@aliko/logger';
import { ValidationPipe } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from '@aliko/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  const logger = app.get(AppLoggerService);
  logger.setServiceName('COMMUNICATION-SERVICE');
  app.useLogger(logger);

  app.enableCors({
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, config.isOriginAllowed(requestOrigin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-internal-service-key', 'Origin'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  await app.listen(config.communicationServicePort, '0.0.0.0');
  console.log(`💬 Communication Service running on port http://localhost:${config.communicationServicePort}/api/v1`);
}
bootstrap();
