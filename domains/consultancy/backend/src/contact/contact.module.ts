import { Module } from '@nestjs/common';
import { MailModule } from '@alikohub/mail';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';

import { EmailService } from '../common/email.service';

@Module({
  imports: [MailModule],
  controllers: [ContactController],
  providers: [ContactService, EmailService],
})
export class ContactModule {}
