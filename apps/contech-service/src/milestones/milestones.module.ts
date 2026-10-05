import { Module } from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MilestonesController],
  providers: [MilestonesService, PrismaService],
})
export class MilestonesModule {}
