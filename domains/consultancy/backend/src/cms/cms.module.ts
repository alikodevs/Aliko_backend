import { Module } from '@nestjs/common';
import { MailModule } from '@alikohub/mail';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { EmailService } from '../common/email.service';

@Module({
  imports: [MailModule],
  controllers: [CmsController],
  providers: [CmsService, EmailService],
})
export class CmsModule {}
