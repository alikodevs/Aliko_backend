import { Module } from '@nestjs/common';
import { SeatTimeService } from './seat-time.service';
import { SeatTimeController } from './seat-time.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [SeatTimeController],
  providers: [SeatTimeService],
  exports: [SeatTimeService],
})
export class SeatTimeModule {}
