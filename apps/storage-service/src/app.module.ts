import { Module } from '@nestjs/common';
import { AppConfigModule } from '@aliko/config';
import { AppLoggerModule } from '@aliko/logger';
import { FileModule } from './file/file.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    FileModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
