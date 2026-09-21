import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Transport } from "@nestjs/microservices";
import * as dotenv from "dotenv";
import { ConfigService } from "@nestjs/config";
import { RpcExceptionFilter } from "./common/filters/rpc-exception.filter";
import { ValidationPipe, Logger } from "@nestjs/common";
import { winstonConfig } from "./winston.config";

dotenv.config();

async function bootstrap() {
  const logger = new Logger("AlikowashBootstrap");
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,
  });

  const PORT = parseInt(process.env.PORT || "3013", 10);
  
  app.enableCors({
    origin: [
      'https://alikowash.alikohub.com',
      'https://www.alikowash.alikohub.com',
      'http://alikowash.alikohub.com',
      'http://www.alikowash.alikohub.com',
      'http://localhost:3000',
      'http://localhost:3004',
    ],
    credentials: true,
  });

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: "0.0.0.0",
      port: PORT,
    },
  });

  // Centralized Global Error Handling
  app.useGlobalFilters(new RpcExceptionFilter());

  // Generalized Validation Handling
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.startAllMicroservices();

  const HTTP_PORT = parseInt(process.env.HTTP_PORT || "4013", 10);
  await app.listen(HTTP_PORT, "0.0.0.0");

  logger.log(
    `Alikowash microservice: TCP port ${PORT}, HTTP port ${HTTP_PORT}`,
  );
}
bootstrap();
