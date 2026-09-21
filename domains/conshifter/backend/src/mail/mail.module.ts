import { Module, Global } from '@nestjs/common';
import { MailModule as SharedMailModule } from '@alikohub/mail';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [SharedMailModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
