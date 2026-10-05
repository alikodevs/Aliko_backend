import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { LocalDiskProvider } from './local.provider';

@Module({
  imports: [ConfigModule],
  controllers: [FileController],
  providers: [FileService, LocalDiskProvider],
  exports: [FileService],
})
export class FileModule {}
