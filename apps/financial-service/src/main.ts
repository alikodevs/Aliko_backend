import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from '@aliko/config';
import { AppLoggerService } from '@aliko/logger';
import { ValidationPipe } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from '@aliko/common';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(AppConfigService);
  const logger = app.get(AppLoggerService);
  logger.setServiceName('FINANCIAL-SERVICE');
  app.useLogger(logger);

  app.enableCors({
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, config.isOriginAllowed(requestOrigin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-internal-service-key', 'stripe-signature', 'chapa-signature', 'Origin'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const tcpPort = Number(process.env.FINANCIAL_TCP_PORT || process.env.PAYMENT_TCP_PORT || process.env.PAYMENT_SERVICE_PORT) || 3012;
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: tcpPort,
    },
  });

  await app.startAllMicroservices();
  await app.listen(config.financialServicePort, '0.0.0.0');
  console.log(`💳 Financial Service running on HTTP port http://localhost:${config.financialServicePort}/api/v1 and TCP port ${tcpPort}`);
}
bootstrap();
