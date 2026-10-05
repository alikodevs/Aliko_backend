import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from '@aliko/config';
import { AppLoggerService } from '@aliko/logger';
import { ValidationPipe } from '@nestjs/common';
import { RpcExceptionFilter } from './common/filters/rpc-exception.filter';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  const logger = app.get(AppLoggerService);
  logger.setServiceName('ACADEMY-SERVICE');
  app.useLogger(logger);

  app.enableCors({
    origin: config.corsAllowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-internal-service-key'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new RpcExceptionFilter());

  const tcpPort = Number(process.env.ACADEMY_TCP_PORT) || 3015;
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: tcpPort,
    },
  });

  await app.startAllMicroservices();
  await app.listen(config.academyServicePort, '0.0.0.0');
  console.log(`🎓 Academy Service running on HTTP port http://localhost:${config.academyServicePort}/api/v1 and TCP port ${tcpPort}`);
}
bootstrap();

