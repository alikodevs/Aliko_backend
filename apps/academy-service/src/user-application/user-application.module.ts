import { Global, Module } from '@nestjs/common';
import { UserApplicationController } from './user-application.controller';
import { UserApplicationService } from './user-application.service';

@Global()
@Module({
  controllers: [UserApplicationController],
  providers: [UserApplicationService],
})
export class UserApplicationModule {}
