import { Module } from '@nestjs/common';
import { AppConfigModule } from '@aliko/config';
import { AppLoggerModule } from '@aliko/logger';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './jobs/jobs.module';
import { VenturesModule } from './ventures/ventures.module';
import { CompaniesModule } from './companies/companies.module';
import { CommunityModule } from './community/community.module';
import { ContactModule } from './contact/contact.module';
import { ContentModule } from './content/content.module';
import { ApplicationsModule } from './applications/applications.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    JobsModule,
    VenturesModule,
    CompaniesModule,
    CommunityModule,
    ContactModule,
    ContentModule,
    ApplicationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
