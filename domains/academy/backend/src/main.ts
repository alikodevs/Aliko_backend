import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { RpcExceptionFilter } from './common/filters/rpc-exception.filter';
import { createFanoutMicroserviceOptions } from '@alikohub/rabbitmq';

dotenv.config(); // Load .env variables first

import { winstonConfig } from './winston.config';

async function bootstrap() {
  // Create Nest application instance
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,
  });

  // Use PORT from env or default 3005
  const PORT = parseInt(process.env.PORT as string) || 3005;

  // Connect TCP microservice
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: PORT,
    },
  });

  // Add RabbitMQ transport for async events (optional - only if available)
  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
  if (process.env.RABBITMQ_ENABLED !== 'false') {
    try {
      app.connectMicroservice(
        createFanoutMicroserviceOptions({
          urls: [rabbitmqUrl],
          queue: 'academy_user_events',
          exchange: 'user_events',
          durable: false,
        }),
      );
      app.connectMicroservice(
        createFanoutMicroserviceOptions({
          urls: [rabbitmqUrl],
          queue: 'academy_payment_fulfillment',
          exchange: 'payment_events',
          durable: true,
        }),
      );
      console.log(`Academy: RabbitMQ transports configured for ${rabbitmqUrl}`);
    } catch (e) {
      console.warn(`Academy: RabbitMQ transport not available: ${e.message}`);
    }
  } else {
    console.log('Academy: RabbitMQ disabled via RABBITMQ_ENABLED=false');
  }

  // Centralized Global Error Handling
  app.useGlobalFilters(new RpcExceptionFilter());

  // Centralized Validation Handling
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Note: Guards are applied at controller level, not globally, to allow health checks

  // Start microservice listeners
  await app.startAllMicroservices();
  const HTTP_PORT = parseInt(process.env.HTTP_PORT as string, 10) || 4025; // Separate port for health checks
  await app.listen(HTTP_PORT, '0.0.0.0');

  console.log(`Academy microservice: TCP port ${PORT}, HTTP port ${HTTP_PORT}`);
}
bootstrap();
