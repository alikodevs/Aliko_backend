import { Module } from '@nestjs/common';
import { ComplianceExporterService } from './compliance-exporter.service';
import { ComplianceExporterController } from './compliance-exporter.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [ComplianceExporterController],
  providers: [ComplianceExporterService],
  exports: [ComplianceExporterService],
})
export class ComplianceExporterModule {}
