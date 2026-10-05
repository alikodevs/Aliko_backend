import { Module } from '@nestjs/common';
import { VenturesService } from './ventures.service';
import { VenturesController } from './ventures.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VenturesController],
  providers: [VenturesService],
  exports: [VenturesService],
})
export class VenturesModule {}
