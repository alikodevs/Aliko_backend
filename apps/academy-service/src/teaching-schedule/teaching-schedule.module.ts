import { Global, Module } from '@nestjs/common';
import { TeachingScheduleController } from './teaching-schedule.controller';
import { TeachingScheduleService } from './teaching-schedule.service';
import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [UserModule],
  controllers: [TeachingScheduleController],
  providers: [TeachingScheduleService],
  exports: [TeachingScheduleService],
})
export class TeachingScheduleModule {}
