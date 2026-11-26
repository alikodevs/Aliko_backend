import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { HealthAdminController } from './health-admin.controller';
import { HealthAdminService } from './health-admin.service';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [HealthAdminController],
  providers: [HealthAdminService],
  exports: [HealthAdminService],
})
export class HealthAdminModule {}
