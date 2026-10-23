import { Module } from '@nestjs/common';
import { SkillsLabService } from './skills-lab.service';
import { SkillsLabController } from './skills-lab.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [SkillsLabController],
  providers: [SkillsLabService],
  exports: [SkillsLabService],
})
export class SkillsLabModule {}
