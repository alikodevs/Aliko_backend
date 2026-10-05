import { Module } from "@nestjs/common";
import { SessionsService } from "./sessions.service";
import { SessionsController } from "./sessions.controller";
import { DatabaseModule } from "../database/database.module";
import { UserModule } from "../user/user.module";
import { AuthModule } from "../auth";

@Module({
  imports: [DatabaseModule, UserModule, AuthModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
