import { Module } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { TicketsController } from "./tickets.controller";
import { DatabaseModule } from "../database/database.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
