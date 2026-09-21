import { Module } from '@nestjs/common';
import { AlikowashController } from './alikowash.controller';

@Module({
  controllers: [AlikowashController],
})
export class AlikowashModule {}
