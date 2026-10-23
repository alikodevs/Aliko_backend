import { Module } from '@nestjs/common';
import { OrientationService } from './orientation.service';
import { OrientationController } from './orientation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [OrientationController],
  providers: [OrientationService],
  exports: [OrientationService],
})
export class OrientationModule {}
