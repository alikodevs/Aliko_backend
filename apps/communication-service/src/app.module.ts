import { Module } from '@nestjs/common';
import { AppConfigModule } from '@aliko/config';
import { AppLoggerModule } from '@aliko/logger';
import { EventBusModule } from '@aliko/event-bus';
import { AppHealthModule } from '@aliko/common';
import { PresenceService } from './presence/presence.service';
import { ChatGateway } from './chat/chat.gateway';
import { NotificationGateway } from './notification/notification.gateway';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    EventBusModule,
    AppHealthModule,
  ],
  providers: [
    PresenceService,
    ChatGateway,
    NotificationGateway,
  ],
})
export class AppModule {}
