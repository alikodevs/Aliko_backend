import { Module } from '@nestjs/common';
import { ConshifterController } from './conshifter.controller';

@Module({
  controllers: [ConshifterController],
})
export class ConshifterServiceModule {}
