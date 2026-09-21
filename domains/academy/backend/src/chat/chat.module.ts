import { Module } from '@nestjs/common';
import { ChatModule as SharedChatModule } from '@alikohub/chat';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SharedChatModule, NotificationsModule],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
