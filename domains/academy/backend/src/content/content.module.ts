import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentAccessGuard } from './guards/content-access.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { createFileUploadClientAsync } from '@alikohub/file-upload-client';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClientsModule.registerAsync([createFileUploadClientAsync()]),
  ],
  controllers: [ContentController],
  providers: [ContentService, ContentAccessGuard, PrismaService],
  exports: [ClientsModule],
})
export class ContentModule {}
