import { Module } from "@nestjs/common";
import { MessagingService } from "./messaging.service";
import { MessagingController } from "./messaging.controller";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth";
import { EmailModule } from "../common/email.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [DatabaseModule, AuthModule, EmailModule, UserModule],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
