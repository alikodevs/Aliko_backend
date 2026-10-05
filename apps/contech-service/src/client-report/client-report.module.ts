import { Module } from '@nestjs/common';
import { ClientReportService } from './client-report.service';
import { ClientReportController } from './client-report.controller';

@Module({
  controllers: [ClientReportController],
  providers: [ClientReportService],
})
export class ClientReportModule {}
