import { NestFactory } from "@nestjs/core";
import { Transport } from "@nestjs/microservices";
import { AppModule } from "./app.module";
import { AppLogger } from "./logger";
// import { EventsProfileGuard } from "./auth";
import { ValidationPipe } from "@nestjs/common";
import { RpcExceptionFilter } from "./common/filters/rpc-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger(),
  });

  const TCP_PORT =
    parseInt(process.env.CONSHIFTER_SERVICE_PORT as string, 10) || 3014;
  const HTTP_PORT = 4014; // Use a separate port for HTTP health checks

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: "0.0.0.0",
      port: TCP_PORT,
    },
  });

  // Add RabbitMQ transport for async events (optional - only if available)
  const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://localhost";
  if (process.env.RABBITMQ_ENABLED !== "false") {
    try {
      app.connectMicroservice({
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: "conshifter_user_events",
          exchange: "user_events",
          exchangeType: "fanout",
          queueOptions: {
            durable: false,
          },
        },
      });
      console.log(`Conshifter: RabbitMQ transport configured for ${rabbitmqUrl}`);
    } catch (e) {
      console.warn(`Conshifter: RabbitMQ transport not available: ${e.message}`);
    }
  } else {
    console.log("Conshifter: RabbitMQ disabled via RABBITMQ_ENABLED=false");
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

  // Apply global guard
  // Note: Guards are applied at controller level, not globally, to allow health checks

  await app.startAllMicroservices();
  await app.listen(HTTP_PORT, "0.0.0.0");
  console.log(
    `Conshifter microservice: TCP port ${TCP_PORT}, HTTP port ${HTTP_PORT}`,
  );
}
bootstrap();
