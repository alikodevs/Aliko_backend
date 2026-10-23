import { Module } from '@nestjs/common';
import { SupportDeskService } from './support-desk.service';
import { SupportDeskController } from './support-desk.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [SupportDeskController],
  providers: [SupportDeskService],
  exports: [SupportDeskService],
})
export class SupportDeskModule {}
