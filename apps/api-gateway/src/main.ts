import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from '@aliko/config';
import { GlobalHttpExceptionFilter } from '@aliko/common';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
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

  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: false,
    })
  );
  app.enableCors({
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, config.isOriginAllowed(requestOrigin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'x-internal-service-key',
      'x-correlation-id',
      'stripe-signature',
      'chapa-signature',
      'Origin',
    ],
    exposedHeaders: ['X-Correlation-ID'],
  });

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
      validate: { xForwardedForHeader: false },
    })
  );

  // 1. Reverse Proxy Routing for User Service
  app.use(
    createProxyMiddleware({
      target: userServiceUrl,
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody,
      },
      pathFilter: [
        '/api/v1/auth/**',
        '/auth/**',
        '/api/v1/users/**',
        '/users/**',
        '/api/v1/roles/**',
        '/roles/**',
        '/api/v1/permissions/**',
        '/permissions/**',
        '/api/v1/verifications/**',
        '/verifications/**',
        '/api/v1/audit-logs/**',
        '/audit-logs/**',
        '/api/v1/rbac/**',
        '/rbac/**',
        '/api/v1/profile/**',
        '/profile/**',
      ],
      pathRewrite: {
        '^/api/v1/auth': '/api/v1',
        '^/auth': '/api/v1',
        '^/users': '/api/v1',
        '^/api/v1/users': '/api/v1',
        '^/rbac': '/api/v1/rbac',
        '^/profile': '/api/v1/profile',
      },
    })
  );

  // 2. Reverse Proxy Routing for Academy Service
  app.use(
    createProxyMiddleware({
      target: academyServiceUrl,
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody,
      },
      pathFilter: [
        '/api/v1/academy/**',
        '/academy/**',
        '/api/v1/courses/**',
        '/courses/**',
        '/api/v1/lessons/**',
        '/lessons/**',
        '/api/v1/cohorts/**',
        '/cohorts/**',
        '/api/v1/enrollments/**',
        '/enrollments/**',
        '/api/v1/enrollment/**',
        '/enrollment/**',
        '/api/v1/progress/**',
        '/progress/**',
        '/api/v1/certificates/**',
        '/certificates/**',
        '/api/v1/announcements/**',
        '/announcements/**',
        '/api/v1/content/**',
        '/content/**',
        '/api/v1/exercises/**',
        '/exercises/**',
        '/api/v1/rubrics',
        '/api/v1/rubrics/**',
        '/rubrics',
        '/rubrics/**',
        '/api/v1/discussions',
        '/api/v1/discussions/**',
        '/discussions',
        '/discussions/**',
        '/api/v1/modules',
        '/api/v1/modules/**',
        '/modules',
        '/modules/**',
        '/api/v1/admissions',
        '/api/v1/admissions/**',
        '/admissions',
        '/admissions/**',
        '/api/v1/orientation',
        '/api/v1/orientation/**',
        '/orientation',
        '/orientation/**',
        '/api/v1/curriculum-crosswalk',
        '/api/v1/curriculum-crosswalk/**',
        '/curriculum-crosswalk',
        '/curriculum-crosswalk/**',
        '/api/v1/study-groups',
        '/api/v1/study-groups/**',
        '/study-groups',
        '/study-groups/**',
        '/api/v1/seat-time',
        '/api/v1/seat-time/**',
        '/seat-time',
        '/seat-time/**',
        '/api/v1/skills-lab',
        '/api/v1/skills-lab/**',
        '/skills-lab',
        '/skills-lab/**',
        '/api/v1/clinical',
        '/api/v1/clinical/**',
        '/clinical',
        '/clinical/**',
        '/api/v1/exam-security',
        '/api/v1/exam-security/**',
        '/exam-security',
        '/exam-security/**',
        '/api/v1/instructors',
        '/api/v1/instructors/**',
        '/instructors',
        '/instructors/**',
        '/api/v1/evaluations',
        '/api/v1/evaluations/**',
        '/evaluations',
        '/evaluations/**',
        '/api/v1/support-desk',
        '/api/v1/support-desk/**',
        '/support-desk',
        '/support-desk/**',
        '/api/v1/gradebook',
        '/api/v1/gradebook/**',
        '/gradebook',
        '/gradebook/**',
        '/api/v1/certification',
        '/api/v1/certification/**',
        '/certification',
        '/certification/**',
        '/api/v1/compliance-exporter',
        '/api/v1/compliance-exporter/**',
        '/compliance-exporter',
        '/compliance-exporter/**',
      ],
      pathRewrite: {
        '^/api/v1/academy': '/api/v1',
        '^/academy': '/api/v1',
        '^/courses': '/api/v1/courses',
        '^/lessons': '/api/v1/lessons',
        '^/cohorts': '/api/v1/cohorts',
        '^/enrollments': '/api/v1/enrollments',
        '^/enrollment': '/api/v1/enrollment',
        '^/progress': '/api/v1/progress',
        '^/certificates': '/api/v1/certificates',
        '^/announcements': '/api/v1/announcements',
        '^/content': '/api/v1/content',
        '^/exercises': '/api/v1/exercises',
        '^/rubrics': '/api/v1/rubrics',
        '^/discussions': '/api/v1/discussions',
        '^/modules': '/api/v1/modules',
        '^/admissions': '/api/v1/admissions',
        '^/orientation': '/api/v1/orientation',
        '^/curriculum-crosswalk': '/api/v1/curriculum-crosswalk',
        '^/study-groups': '/api/v1/study-groups',
        '^/seat-time': '/api/v1/seat-time',
        '^/skills-lab': '/api/v1/skills-lab',
        '^/clinical': '/api/v1/clinical',
        '^/exam-security': '/api/v1/exam-security',
        '^/instructors': '/api/v1/instructors',
        '^/evaluations': '/api/v1/evaluations',
        '^/support-desk': '/api/v1/support-desk',
        '^/gradebook': '/api/v1/gradebook',
        '^/certification': '/api/v1/certification',
        '^/compliance-exporter': '/api/v1/compliance-exporter',
      },


    })
  );

  // 3. Reverse Proxy Routing for ConTech Service
  app.use(
    createProxyMiddleware({
      target: contechServiceUrl,
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody,
      },
      pathFilter: [
        '/api/v1/contech/**',
        '/contech/**',
        '/api/v1/projects/**',
        '/projects/**',
        '/api/v1/tasks/**',
        '/tasks/**',
        '/api/v1/contracts/**',
        '/contracts/**',
      ],
      pathRewrite: {
        '^/api/v1/contech': '/api/v1',
        '^/contech': '/api/v1',
        '^/projects': '/api/v1/projects',
        '^/tasks': '/api/v1/tasks',
        '^/contracts': '/api/v1/contracts',
      },
    })
  );

  // 4. Reverse Proxy Routing for Events Service
  app.use(
    createProxyMiddleware({
      target: eventsServiceUrl,
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody,
      },
      pathFilter: [
        '/api/v1/events/**',
        '/events/**',
        '/api/v1/tickets/**',
        '/tickets/**',
      ],
      pathRewrite: {
        '^/api/v1/events': '/api/v1',
        '^/events': '/api/v1',
        '^/tickets': '/api/v1/tickets',
      },
    })
  );

  // 5. Reverse Proxy Routing for Careers Service
  app.use(
    createProxyMiddleware({
      target: careersServiceUrl,
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody,
      },
      pathFilter: [
        '/api/v1/careers/**',
        '/careers/**',
        '/api/v1/jobs/**',
        '/jobs/**',
        '/api/v1/applications/**',
        '/applications/**',
      ],
      pathRewrite: {
        '^/api/v1/careers': '/api/v1',
        '^/careers': '/api/v1',
        '^/jobs': '/api/v1/jobs',
        '^/applications': '/api/v1/applications',
      },
    })
  );

  // 6. Reverse Proxy Routing for Financial Service
  app.use(
    createProxyMiddleware({
      target: financialServiceUrl,
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody,
      },
      pathFilter: [
        '/api/v1/financial/**',
        '/financial/**',
        '/api/v1/payments/**',
        '/payments/**',
        '/api/v1/wallets/**',
        '/wallets/**',
        '/api/v1/escrow/**',
        '/escrow/**',
        '/api/v1/subscriptions/**',
        '/subscriptions/**',
      ],
      pathRewrite: {
        '^/api/v1/financial': '/api/v1',
        '^/financial': '/api/v1',
        '^/payments': '/api/v1/payments',
        '^/wallets': '/api/v1/wallets',
        '^/escrow': '/api/v1/escrow',
        '^/subscriptions': '/api/v1/subscriptions',
      },
    })
  );

  // 7. Reverse Proxy Routing for Communication Service (with WebSockets)
  app.use(
    createProxyMiddleware({
      target: communicationServiceUrl,
      changeOrigin: true,
      ws: true,
      on: {
        proxyReq: fixRequestBody,
      },
      pathFilter: [
        '/api/v1/communication/**',
        '/communication/**',
        '/api/v1/conversations/**',
        '/conversations/**',
        '/api/v1/messages/**',
        '/messages/**',
        '/api/v1/notifications/**',
        '/chat/**',
        '/notifications/**',
      ],
      pathRewrite: {
        '^/api/v1/communication': '/api/v1',
        '^/communication': '/api/v1',
        '^/conversations': '/api/v1/conversations',
        '^/messages': '/api/v1/messages',
      },
    })
  );

  // 8. Reverse Proxy Routing for Storage Service
  app.use(
    createProxyMiddleware({
      target: storageServiceUrl,
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody,
      },
      pathFilter: [
        '/api/v1/storage/**',
        '/storage/**',
        '/api/v1/files/**',
        '/files/**',
        '/api/v1/uploads/**',
        '/uploads/**',
        '/api/v1/upload/**',
        '/upload/**',
      ],
      pathRewrite: {
        '^/api/v1/storage': '/api/v1',
        '^/storage': '/api/v1',
        '^/upload': '/api/v1/upload',
        '^/uploads': '/api/v1/uploads',
        '^/files': '/api/v1/files',
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
