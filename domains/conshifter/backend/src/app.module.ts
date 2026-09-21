import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule } from "@nestjs/config";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth";
import { AppController } from "./app.controller";

import { EventsModule } from "./events/events.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { ProgramsModule } from "./programs/programs.module";
import { PartnersModule } from "./partners/partners.module";
import { TestimonialsModule } from "./testimonials/testimonials.module";
import { StatsModule } from "./stats/stats.module";
import { ApplicationsModule } from "./applications/applications.module";
import { SubscribersModule } from "./subscribers/subscribers.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { MailModule } from "./mail/mail.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    UserModule,
    AuthModule,
    EventsModule,
    OrganizationsModule,
    ProgramsModule,
    PartnersModule,
    TestimonialsModule,
    StatsModule,
    ApplicationsModule,
    SubscribersModule,
    DashboardModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
