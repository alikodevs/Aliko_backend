import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get apiGatewayPort(): number {
    return Number(this.configService.get<number>('API_GATEWAY_PORT', 3000));
  }

  get corsAllowedOrigins(): string[] {
    return this.configService
      .get<string>('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get userServicePort(): number {
    return Number(this.configService.get<number>('USER_SERVICE_PORT', 3001));
  }

  get academyServicePort(): number {
    return Number(this.configService.get<number>('ACADEMY_SERVICE_PORT', 3002));
  }

  get contechServicePort(): number {
    return Number(this.configService.get<number>('CONTECH_SERVICE_PORT', 3003));
  }

  get eventsServicePort(): number {
    return Number(this.configService.get<number>('EVENTS_SERVICE_PORT', 3004));
  }

  get careersServicePort(): number {
    return Number(this.configService.get<number>('CAREERS_SERVICE_PORT', 3005));
  }

  get financialServicePort(): number {
    return Number(this.configService.get<number>('FINANCIAL_SERVICE_PORT', 3006));
  }

  get communicationServicePort(): number {
    return Number(this.configService.get<number>('COMMUNICATION_SERVICE_PORT', 3007));
  }

  get storageServicePort(): number {
    return Number(this.configService.get<number>('STORAGE_SERVICE_PORT', 3008));
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET', 'aliko-secret-jwt-key-change-in-production');
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '7d');
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET', `${this.jwtSecret}-refresh`);
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
  }

  get internalServiceSecret(): string {
    return this.configService.get<string>('INTERNAL_SERVICE_SECRET', 'aliko-internal-secret-change-in-production');
  }

  get rabbitmqUri(): string {
    return this.configService.get<string>('RABBITMQ_URI', 'amqp://guest:guest@localhost:5672');
  }

  get redisHost(): string {
    return this.configService.get<string>('REDIS_HOST', 'localhost');
  }

  get redisPort(): number {
    return Number(this.configService.get<number>('REDIS_PORT', 6379));
  }

  get localUploadDir(): string {
    return this.configService.get<string>('LOCAL_UPLOAD_DIR', './uploads');
  }

  get databaseUrlUser(): string {
    return this.configService.get<string>('DATABASE_URL_USER', '');
  }

  get databaseUrlAcademy(): string {
    return this.configService.get<string>('DATABASE_URL_ACADEMY', '');
  }

  get databaseUrlContech(): string {
    return this.configService.get<string>('DATABASE_URL_CONTECH', '');
  }

  get databaseUrlEvents(): string {
    return this.configService.get<string>('DATABASE_URL_EVENTS', '');
  }

  get databaseUrlCareers(): string {
    return this.configService.get<string>('DATABASE_URL_CAREERS', '');
  }

  get databaseUrlFinancial(): string {
    return this.configService.get<string>('DATABASE_URL_FINANCIAL', '');
  }

  get databaseUrlCommunication(): string {
    return this.configService.get<string>('DATABASE_URL_COMMUNICATION', '');
  }

  get smtpHost(): string {
    return this.configService.get<string>('SMTP_HOST', 'localhost');
  }

  get smtpPort(): number {
    return Number(this.configService.get<number>('SMTP_PORT', 1025));
  }

  get smtpUser(): string {
    return this.configService.get<string>('SMTP_USER', '');
  }

  get smtpPass(): string {
    return this.configService.get<string>('SMTP_PASS', '');
  }

  get mailFrom(): string {
    return this.configService.get<string>('MAIL_FROM', 'noreply@alikohub.com');
  }
}
