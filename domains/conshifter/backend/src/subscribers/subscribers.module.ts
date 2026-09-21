import { Module } from '@nestjs/common';
import { SubscribersController } from './subscribers.controller';
import { SubscribersService } from './subscribers.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SubscribersController],
  providers: [SubscribersService],
  exports: [SubscribersService],
})
export class SubscribersModule {}
