import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
