import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
