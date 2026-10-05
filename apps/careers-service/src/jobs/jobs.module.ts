import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
