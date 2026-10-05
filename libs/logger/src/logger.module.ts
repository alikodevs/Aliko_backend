import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppLoggerService } from './logger.service';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { HttpLoggingInterceptor } from './http-logging.interceptor';

@Global()
@Module({
  providers: [AppLoggerService, HttpLoggingInterceptor],
  exports: [AppLoggerService, HttpLoggingInterceptor],
})
export class AppLoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('{*path}');
  }
}
