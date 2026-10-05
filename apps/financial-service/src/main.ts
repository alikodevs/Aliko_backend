import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from '@aliko/config';
import { AppLoggerService } from '@aliko/logger';
import { ValidationPipe } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from '@aliko/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(AppConfigService);
  const logger = app.get(AppLoggerService);
  logger.setServiceName('FINANCIAL-SERVICE');
  app.useLogger(logger);

  app.enableCors({
    origin: config.corsAllowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-internal-service-key', 'stripe-signature', 'chapa-signature'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  await app.listen(config.financialServicePort, '0.0.0.0');
  console.log(`💳 Financial Service running on port http://localhost:${config.financialServicePort}/api/v1`);
}
bootstrap();
