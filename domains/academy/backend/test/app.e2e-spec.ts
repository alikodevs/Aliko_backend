import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import {
  AUTH_MESSAGE_PATTERNS,
  AUTH_SERVICE,
  createAuthClientAsync,
} from '@alikohub/auth-client';
import {
  PAYMENT_MESSAGE_PATTERNS,
  PAYMENT_SERVICE,
  createPaymentClientAsync,
} from '@alikohub/payment-client';
import { createFanoutMicroserviceOptions } from '@alikohub/rabbitmq';
import { createFileUploadClientAsync, FILE_UPLOAD_SERVICE } from '@alikohub/file-upload-client';
import { PushNotificationService } from '@alikohub/notification';
import { createWinstonLogger } from '@alikohub/logger';
import { Transport } from '@nestjs/microservices';

/**
 * Academy e2e focused on:
 * 1) HTTP health surface
 * 2) library integration contracts used by academy (auth/payment/file-upload/rmq/notification/logger)
 */
describe('Academy (e2e) + library integrations', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    app = moduleFixture.createNestApplication({
      logger: false,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('HTTP health', () => {
    it('GET /health returns ok', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('library contracts used by academy', () => {
    it('auth-client points at TCP auth service', () => {
      const entry = createAuthClientAsync();
      expect(entry.name).toBe(AUTH_SERVICE);
      const opts = entry.useFactory({
        get: (k: string) =>
          k === 'AUTH_SERVICE_HOST'
            ? 'auth-service'
            : k === 'AUTH_TCP_PORT'
              ? '3011'
              : undefined,
      });
      expect(opts.transport).toBe(Transport.TCP);
      expect(opts.options).toEqual({ host: 'auth-service', port: 3011 });
      expect(AUTH_MESSAGE_PATTERNS.GET_USER_PROFILE).toBe('get_user_profile');
    });

    it('payment-client points at TCP payment service', () => {
      const entry = createPaymentClientAsync();
      expect(entry.name).toBe(PAYMENT_SERVICE);
      const opts = entry.useFactory({
        get: (k: string) =>
          k === 'PAYMENT_SERVICE_HOST'
            ? 'payment-service'
            : k === 'PAYMENT_SERVICE_PORT'
              ? '3012'
              : undefined,
      });
      expect(opts.transport).toBe(Transport.TCP);
      expect(opts.options).toEqual({ host: 'payment-service', port: 3012 });
      expect(PAYMENT_MESSAGE_PATTERNS.CREATE_CHECKOUT).toBe('create_checkout');
    });

    it('file-upload-client registers TCP upload service', () => {
      const entry = createFileUploadClientAsync();
      expect(entry.name).toBe(FILE_UPLOAD_SERVICE);
      const opts = entry.useFactory({
        get: (k: string) =>
          k === 'FILE_UPLOAD_SERVICE_HOST'
            ? 'file-upload-service'
            : k === 'FILE_UPLOAD_TCP_PORT'
              ? '3019'
              : undefined,
      });
      expect(opts.transport).toBe(Transport.TCP);
      expect(opts.options.host).toBe('file-upload-service');
      expect(opts.options.port).toBe(3019);
    });

    it('rabbitmq fanout options match academy queues', () => {
      const userEvents = createFanoutMicroserviceOptions({
        urls: ['amqp://alikohub:secret@rabbitmq:5672'],
        queue: 'academy_user_events',
        exchange: 'user_events',
        durable: false,
      });
      const paymentEvents = createFanoutMicroserviceOptions({
        urls: ['amqp://alikohub:secret@rabbitmq:5672'],
        queue: 'academy_payment_fulfillment',
        exchange: 'payment_events',
        durable: true,
      });

      expect(userEvents.transport).toBe(Transport.RMQ);
      expect(userEvents.options?.queue).toBe('academy_user_events');
      expect(paymentEvents.options?.queue).toBe('academy_payment_fulfillment');
      expect(paymentEvents.options?.queueOptions?.durable).toBe(true);
    });

    it('notification package can simulate push without firebase', async () => {
      const push = new PushNotificationService();
      const result = await push.sendCourseCreatedNotification(
        'E2E Course',
        '101',
        'Testing',
      );
      expect(result.success).toBe(true);
    });

    it('logger factory creates a nest winston logger', () => {
      const logger = createWinstonLogger('AcademyService');
      expect(logger).toBeDefined();
      expect(typeof (logger as any).log).toBe('function');
    });
  });
});
