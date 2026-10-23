import { Module } from '@nestjs/common';
import { CurriculumCrosswalkService } from './curriculum-crosswalk.service';
import { CurriculumCrosswalkController } from './curriculum-crosswalk.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [CurriculumCrosswalkController],
  providers: [CurriculumCrosswalkService],
  exports: [CurriculumCrosswalkService],
})
export class CurriculumCrosswalkModule {}
