import { Module } from '@nestjs/common';
import { AdmissionsService } from './admissions.service';
import { AdmissionsController } from './admissions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { OrientationModule } from '../orientation/orientation.module';

@Module({
  imports: [PrismaModule, UserModule, OrientationModule],
  controllers: [AdmissionsController],
  providers: [AdmissionsService],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}
