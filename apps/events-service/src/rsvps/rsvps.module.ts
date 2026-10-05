import { Module } from "@nestjs/common";
import { RsvpsService } from "./rsvps.service";
import { RsvpsController } from "./rsvps.controller";
import { DatabaseModule } from "../database/database.module";
import { UserModule } from "../user/user.module";
import { EmailModule } from "../common/email.module";

@Module({
  imports: [DatabaseModule, UserModule, EmailModule],
  controllers: [RsvpsController],
  providers: [RsvpsService],
  exports: [RsvpsService],
})
export class RsvpsModule {}
