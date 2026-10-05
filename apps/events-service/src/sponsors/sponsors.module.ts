import { Module } from "@nestjs/common";
import { SponsorsService } from "./sponsors.service";
import { SponsorsController } from "./sponsors.controller";
import { DatabaseModule } from "../database/database.module";
import { UserModule } from "../user/user.module";
import { AuthModule } from "../auth";

@Module({
  imports: [DatabaseModule, UserModule, AuthModule],
  controllers: [SponsorsController],
  providers: [SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
