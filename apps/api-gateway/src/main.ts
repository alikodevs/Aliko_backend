import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from '@aliko/config';
import { GlobalHttpExceptionFilter } from '@aliko/common';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppLoggerService } from '@aliko/logger';
import { green, blue, yellow, red, magenta, cyan, gray, bold } from 'colorette';

function colorMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return green(method);
    case 'POST': return blue(method);
    case 'PATCH': return yellow(method);
    case 'PUT': return magenta(method);
    case 'DELETE': return red(method);
    default: return cyan(method);
  }
}

function colorStatus(status: number): string {
  if (status >= 500) return bold(red(`[${status}]`));
  if (status >= 400) return bold(yellow(`[${status}]`));
  if (status >= 300) return bold(cyan(`[${status}]`));
  return bold(green(`[${status}]`));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  const logger = app.get(AppLoggerService);
  logger.setServiceName('API-GATEWAY');
  app.useLogger(logger);

  const userServiceUrl = process.env.USER_SERVICE_URL || `http://localhost:${config.userServicePort}`;
  const academyServiceUrl = process.env.ACADEMY_SERVICE_URL || `http://localhost:${config.academyServicePort}`;
  const contechServiceUrl = process.env.CONTECH_SERVICE_URL || `http://localhost:${config.contechServicePort}`;
  const eventsServiceUrl = process.env.EVENTS_SERVICE_URL || `http://localhost:${config.eventsServicePort}`;
  const careersServiceUrl = process.env.CAREERS_SERVICE_URL || `http://localhost:${config.careersServicePort}`;
  const financialServiceUrl = process.env.FINANCIAL_SERVICE_URL || `http://localhost:${config.financialServicePort}`;
  const communicationServiceUrl = process.env.COMMUNICATION_SERVICE_URL || `http://localhost:${config.communicationServicePort}`;
  const storageServiceUrl = process.env.STORAGE_SERVICE_URL || `http://localhost:${config.storageServicePort}`;

  // Live Winston HTTP Traffic Logging Middleware
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      `req-${Math.random().toString(36).substring(2, 8)}`;
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    const url = req.originalUrl || req.url;
    if (!url.endsWith('/metrics') && !url.includes('/health')) {
      const hasBody = req.body && Object.keys(req.body).length > 0;
      const bodyStr = hasBody ? ` | Payload: ${JSON.stringify(req.body)}` : '';
      logger.log(`📥 INCOMING ${colorMethod(req.method)} ${cyan(url)}${gray(bodyStr)}`, 'GATEWAY-PROXY');
    }

    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      if (url.includes('/metrics') || url.includes('/health')) return;

      if (status >= 400) {
        logger.warn(
          `📤 RESPONSE ${colorMethod(req.method)} ${cyan(url)} -> ${colorStatus(status)} ${cyan(`(${duration}ms)`)}`,
          'GATEWAY-PROXY'
        );
      } else {
        logger.log(
          `📤 RESPONSE ${colorMethod(req.method)} ${cyan(url)} -> ${colorStatus(status)} ${cyan(`(${duration}ms)`)}`,
          'GATEWAY-PROXY'
        );
      }
    });
    next();
  });

  app.use(helmet());
  app.enableCors({
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!requestOrigin) return callback(null, true);
      const isAllowed =
        config.corsAllowedOrigins.includes(requestOrigin) ||
        /\.alikohub\.com$/.test(new URL(requestOrigin).hostname) ||
        requestOrigin.includes('localhost') ||
        requestOrigin.includes('127.0.0.1');
      callback(null, isAllowed);
    },
    credentials: true,
  });

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // 1. Reverse Proxy Routing for User Service
  app.use(
    createProxyMiddleware({
      target: userServiceUrl,
      changeOrigin: true,
      pathFilter: [
        '/api/v1/auth/**',
        '/api/v1/users/**',
        '/api/v1/roles/**',
        '/api/v1/permissions/**',
        '/api/v1/verifications/**',
        '/api/v1/audit-logs/**',
      ],
    })
  );

  // 2. Reverse Proxy Routing for Academy Service
  app.use(
    createProxyMiddleware({
      target: academyServiceUrl,
      changeOrigin: true,
      pathFilter: [
        '/api/v1/academy/**',
        '/api/v1/courses/**',
        '/api/v1/lessons/**',
        '/api/v1/cohorts/**',
        '/api/v1/enrollments/**',
        '/api/v1/certificates/**',
      ],
      pathRewrite: {
        '^/api/v1/academy': '/api/v1',
      },
    })
  );

  // 3. Reverse Proxy Routing for ConTech Service
  app.use(
    createProxyMiddleware({
      target: contechServiceUrl,
      changeOrigin: true,
      pathFilter: [
        '/api/v1/contech/**',
        '/api/v1/projects/**',
        '/api/v1/tasks/**',
        '/api/v1/contracts/**',
      ],
      pathRewrite: {
        '^/api/v1/contech': '/api/v1',
      },
    })
  );

  // 4. Reverse Proxy Routing for Events Service
  app.use(
    createProxyMiddleware({
      target: eventsServiceUrl,
      changeOrigin: true,
      pathFilter: [
        '/api/v1/events/**',
        '/api/v1/tickets/**',
      ],
      pathRewrite: {
        '^/api/v1/events': '/api/v1',
      },
    })
  );

  // 5. Reverse Proxy Routing for Careers Service
  app.use(
    createProxyMiddleware({
      target: careersServiceUrl,
      changeOrigin: true,
      pathFilter: [
        '/api/v1/careers/**',
        '/api/v1/jobs/**',
        '/api/v1/applications/**',
      ],
      pathRewrite: {
        '^/api/v1/careers': '/api/v1',
      },
    })
  );

  // 6. Reverse Proxy Routing for Financial Service
  app.use(
    createProxyMiddleware({
      target: financialServiceUrl,
      changeOrigin: true,
      pathFilter: [
        '/api/v1/financial/**',
        '/api/v1/payments/**',
        '/api/v1/wallets/**',
        '/api/v1/escrow/**',
        '/api/v1/subscriptions/**',
      ],
      pathRewrite: {
        '^/api/v1/financial': '/api/v1',
      },
    })
  );

  // 7. Reverse Proxy Routing for Communication Service (with WebSockets)
  app.use(
    createProxyMiddleware({
      target: communicationServiceUrl,
      changeOrigin: true,
      ws: true,
      pathFilter: [
        '/api/v1/communication/**',
        '/api/v1/conversations/**',
        '/api/v1/messages/**',
        '/api/v1/notifications/**',
        '/chat/**',
        '/notifications/**',
      ],
      pathRewrite: {
        '^/api/v1/communication': '/api/v1',
      },
    })
  );

  // 8. Reverse Proxy Routing for Storage Service
  app.use(
    createProxyMiddleware({
      target: storageServiceUrl,
      changeOrigin: true,
      pathFilter: [
        '/api/v1/storage/**',
        '/api/v1/files/**',
        '/api/v1/uploads/**',
        '/uploads/**',
      ],
      pathRewrite: {
        '^/api/v1/storage': '/api/v1',
      },
    })
  );

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  if (config.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AlikoHub API Gateway')
      .setDescription('Unified API Gateway for AlikoHub Microservices Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`📚 Swagger Docs available at http://localhost:${config.apiGatewayPort}/api/docs`);
  }

  await app.listen(config.apiGatewayPort);
  console.log(`🚀 API Gateway running on port http://localhost:${config.apiGatewayPort}/api/v1`);
}
bootstrap();
