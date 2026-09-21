import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  const TCP_PORT = parseInt(process.env.CAREERS_SERVICE_PORT) || 3008;
  const HTTP_PORT = 4008;

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: TCP_PORT,
    },
  });
  
  await app.startAllMicroservices();
  await app.listen(HTTP_PORT, '0.0.0.0');
  console.log(`Careers microservice: TCP port ${TCP_PORT}, HTTP port ${HTTP_PORT}`);
}

bootstrap();
