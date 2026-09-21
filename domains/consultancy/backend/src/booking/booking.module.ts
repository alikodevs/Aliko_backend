import { Module } from '@nestjs/common';
import { MailModule } from '@alikohub/mail';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';

import { EmailService } from '../common/email.service';

@Module({
  imports: [MailModule],
  controllers: [BookingController],
  providers: [BookingService, EmailService],
})
export class BookingModule {}
