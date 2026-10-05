import { AppLoggerService } from './logger.service';

export * from './correlation-id.context';
export * from './correlation-id.middleware';
export * from './http-logging.interceptor';
export * from './logger.service';
export * from './logger.module';

export function createWinstonLogger(serviceName?: string) {
  return new AppLoggerService(serviceName);
}
