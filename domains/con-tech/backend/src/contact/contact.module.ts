import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { createAuthClientAsync } from '@alikohub/auth-client';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

@Module({
  imports: [ClientsModule.registerAsync([createAuthClientAsync()])],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
