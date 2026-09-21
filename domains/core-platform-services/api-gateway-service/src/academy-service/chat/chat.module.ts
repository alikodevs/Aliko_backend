import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { createAuthClientAsync } from '@alikohub/auth-client';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimeService } from './chat-realtime.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ACADEMY_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.ACADEMY_SERVICE_HOST || '127.0.0.1',
          port: Number(process.env.ACADEMY_SERVICE_PORT) || 3005,
        },
      },
    ]),
    ClientsModule.registerAsync([createAuthClientAsync()]),
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatRealtimeService],
  exports: [ChatRealtimeService],
})
export class ChatModule {}
