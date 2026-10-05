import { Global, Module } from '@nestjs/common';
import { ConTechProfileGuard } from './contech-profile.guard';

@Global()
@Module({
  providers: [ConTechProfileGuard],
  exports: [ConTechProfileGuard],
})
export class AuthModule {}
