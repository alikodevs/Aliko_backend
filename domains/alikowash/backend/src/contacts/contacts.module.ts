import { Module } from "@nestjs/common";
import { MailModule } from "@alikohub/mail";
import { ContactsService } from "./contacts.service";
import { ContactsController } from "./contacts.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailService } from "../common/email.service";

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [ContactsController],
  providers: [ContactsService, EmailService],
  exports: [ContactsService, EmailService],
})
export class ContactsModule {}
