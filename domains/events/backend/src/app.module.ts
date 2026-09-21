import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule } from "@nestjs/config";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth";
import { PostsModule } from "./posts/posts.module";
import { PromotionRequestsModule } from "./promotion-requests/promotion-requests.module";
import { TicketsModule } from "./tickets/tickets.module";
import { RegistrationsModule } from "./registrations/registrations.module";
import { RsvpsModule } from "./rsvps/rsvps.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { MessagingModule } from "./messaging/messaging.module";
import { SessionsModule } from "./sessions/sessions.module";
import { SponsorsModule } from "./sponsors/sponsors.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    PostsModule,
    PromotionRequestsModule,
    TicketsModule,
    RegistrationsModule,
    RsvpsModule,
    PortfolioModule,
    MessagingModule,
    SessionsModule,
    SponsorsModule,
    UserModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
