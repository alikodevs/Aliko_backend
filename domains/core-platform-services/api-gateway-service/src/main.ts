import { otelSDK } from './common/tracing/tracing';
import * as dotenv from 'dotenv';
import * as process from 'process';
dotenv.config();

// Start OpenTelemetry SDK
otelSDK.start();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import express from 'express';
import * as path from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UserModule } from './auth-service/user/user.module';
import { ConTechServiceModule } from './contech-service/contech-service.module';
import { EventsServiceModule } from './events-service/events-service.module';
import { AcademyServiceModule } from './academy-service';
import { winstonConfig } from './winston.config';
import { RpcExceptionFilter } from './common/filters';

// Bootstrap the application
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,
    rawBody: true,
  });

  const logger = new Logger('Bootstrap');

  // Enable CORS
  // Enable CORS
  // Enable CORS with explicit origins for production
  const allowedOrigins = [
    'https://lms.alikohub.com',
    'https://www.lms.alikohub.com',
    'http://lms.alikohub.com',
    'http://www.lms.alikohub.com',
    'https://www.academy.alikohub.com',
    'https://academy.alikohub.com',
    'http://www.academy.alikohub.com',
    'http://academy.alikohub.com',
    'https://www.alikohub.com',
    'https://alikohub.com',
    'http://www.alikohub.com',
    'http://alikohub.com',
    'https://career.alikohub.com',
    'https://www.career.alikohub.com',
    'http://career.alikohub.com',
    'http://www.career.alikohub.com',
    'https://event.alikohub.com',
    'https://www.event.alikohub.com',
    'http://event.alikohub.com',
    'http://www.event.alikohub.com',
    'https://con-tech.alikohub.com',
    'https://www.con-tech.alikohub.com',
    'http://con-tech.alikohub.com',
    'http://www.con-tech.alikohub.com',
    'https://consultancy.alikohub.com',
    'https://www.consultancy.alikohub.com',
    'http://consultancy.alikohub.com',
    'http://www.consultancy.alikohub.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003',
    'http://localhost:3006',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8082',
    'http://127.0.0.1:8083',
    'http://116.203.122.210:8080',
    'http://116.203.122.210:8081',
    'http://116.203.122.210:8082',
    'http://116.203.122.210:8083',
    'http://localhost:3004',
    'http://localhost:3008',
    'http://localhost:3005',
    'http://116.203.122.210:3004',
    'http://116.203.122.210:3005',
    'http://116.203.122.210:8081',
    'http://116.203.122.210:3002',
    'http://116.203.122.210:3003',
    'https://alikowash.alikohub.com',
    'https://www.alikowash.alikohub.com',
    'http://alikowash.alikohub.com',
    'http://www.alikowash.alikohub.com',
  ];

  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(requestOrigin) ||
        /\.alikohub\.com$/.test(new URL(requestOrigin).hostname) ||
        requestOrigin.includes('localhost') ||
        requestOrigin.includes('127.0.0.1');
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Cookie', 
      'X-Requested-With', 
      'Accept', 
      'Origin',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
      'x-apollo-operation-name',
      'apollo-require-preflight',
      'cf-ipcountry',
      'x-forwarded-for'
    ],
    exposedHeaders: ['Set-Cookie', 'Authorization'],
    maxAge: 3600, // 1 hour cache for preflight
  });

  const uploadPath = path.resolve(process.env.UPLOAD_PATH || '/root/Home-Project/uploads');
  app.use('/uploads', express.static(uploadPath));
  app.use('/consultancy/uploads', express.static(uploadPath));
  app.use('/api/uploads', express.static(uploadPath));
  app.use('/api/consultancy/uploads', express.static(uploadPath));

  // Global validation pipe with detailed error messages
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    disableErrorMessages: false,
    validationError: {
      target: false,
      value: false,
    },
  }));

  // Global exception filters
  app.useGlobalFilters(new RpcExceptionFilter());

  app.use(cookieParser());

  // Swagger setup - Main
  const config = new DocumentBuilder()
    .setTitle('Alikohub API Gateway')
    .setDescription('Central API Gateway documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Swagger setup - Auth Service
  const authConfig = new DocumentBuilder()
    .setTitle('Auth Service API')
    .setDescription('Authentication and User Management endpoints')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const authDocument = SwaggerModule.createDocument(app, authConfig, {
    include: [UserModule],
  });
  SwaggerModule.setup('api-docs/auth', app, authDocument);

  // Swagger setup - ConTech Service
  const contechConfig = new DocumentBuilder()
    .setTitle('ConTech Service API')
    .setDescription('Construction Technology endpoints (Projects, Tasks, Contracts, etc.)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const contechDocument = SwaggerModule.createDocument(app, contechConfig, {
    include: [ConTechServiceModule],
  });
  SwaggerModule.setup('api-docs/contech', app, contechDocument);

  // Swagger setup - Events Service
  const eventsConfig = new DocumentBuilder()
    .setTitle('Events Service API')
    .setDescription('Events Management endpoints')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const eventsDocument = SwaggerModule.createDocument(app, eventsConfig, {
    include: [EventsServiceModule],
  });
  SwaggerModule.setup('api-docs/events', app, eventsDocument);

  // Swagger setup - Academy Service
  const academyConfig = new DocumentBuilder()
    .setTitle('Academy Service API')
    .setDescription('Academy and LMS endpoints')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const academyDocument = SwaggerModule.createDocument(app, academyConfig, {
    include: [AcademyServiceModule],
  });
  SwaggerModule.setup('api-docs/academy', app, academyDocument);

  const port = process.env.API_GATEWAY_PORT || 3006;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 API Gateway running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at http://localhost:${port}/api-docs`);
}
bootstrap();
 
