import { Module } from '@nestjs/common';
import { ExamSecurityService } from './exam-security.service';
import { ExamSecurityController } from './exam-security.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [ExamSecurityController],
  providers: [ExamSecurityService],
  exports: [ExamSecurityService],
})
export class ExamSecurityModule {}
