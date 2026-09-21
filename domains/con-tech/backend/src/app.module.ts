import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { InspectionsModule } from './inspections/inspections.module';
import { UserApplicationModule } from './user-application/user-application.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ClientReportModule } from './client-report/client-report.module';
import { ContractModule } from './contract/contract.module';
import { ContactModule } from './contact/contact.module';
import { MilestonesModule } from './milestones/milestones.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    AdminModule,
    ProjectsModule,
    TasksModule,
    PrismaModule,
    CloudinaryModule,
    InspectionsModule,
    UserApplicationModule,
    ClientReportModule,
    ContractModule,
    MilestonesModule,
    ContactModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
