import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppConfigModule } from '@aliko/config';
import { AppLoggerModule } from '@aliko/logger';
import { MetricsModule, MetricsController, TracingMiddleware } from '@aliko/common';
import { HealthController } from './health.controller';

@Module({
  imports: [AppConfigModule, AppLoggerModule, MetricsModule],
  controllers: [HealthController, MetricsController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TracingMiddleware).forRoutes('{*path}');
  }
}
