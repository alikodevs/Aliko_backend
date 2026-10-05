import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { EventsProfileGuard } from "./events-profile.guard";
import { RoleGuard } from "./roles/roles.guard";

@Module({
  imports: [UserModule],
  providers: [EventsProfileGuard, RoleGuard],
  exports: [EventsProfileGuard, RoleGuard, UserModule],
})
export class AuthModule {}
