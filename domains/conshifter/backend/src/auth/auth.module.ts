import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { ConshifterProfileGuard } from "./conshifter-profile.guard";
import { RoleGuard } from "./roles/roles.guard";

@Module({
  imports: [UserModule],
  providers: [ConshifterProfileGuard, RoleGuard],
  exports: [ConshifterProfileGuard, RoleGuard, UserModule],
})
export class AuthModule {}
