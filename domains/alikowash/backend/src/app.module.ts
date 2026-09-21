import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { PartnersModule } from "./partners/partners.module";
import { ContactsModule } from "./contacts/contacts.module";
import { DonationsModule } from "./donations/donations.module";
import { StoriesModule } from "./stories/stories.module";
import { TeamModule } from "./team/team.module";
import { SettingsModule } from "./settings/settings.module";
import { UserModule } from "./user/user.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ProjectsModule,
    PartnersModule,
    ContactsModule,
    DonationsModule,
    StoriesModule,
    TeamModule,
    SettingsModule,
    UserModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
