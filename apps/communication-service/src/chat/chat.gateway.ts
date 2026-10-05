import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PresenceService } from '../presence/presence.service';
import { AppLoggerService } from '@aliko/logger';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly presenceService: PresenceService,
    private readonly logger: AppLoggerService
  ) {}

  handleConnection(client: Socket) {
    const userId = (client.handshake.query.userId as string) || (client.handshake.auth?.userId as string);
    if (userId) {
      this.presenceService.setUserOnline(userId, client.id);
      client.join(`user:${userId}`);
      this.server.emit('user:presence', { userId, status: 'ONLINE', lastSeen: new Date() });
      this.logger.log(`Client connected: ${client.id} (user: ${userId})`, 'ChatGateway');
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.handshake.query.userId as string) || (client.handshake.auth?.userId as string);
    if (userId) {
      this.presenceService.setUserOffline(userId, client.id);
      this.server.emit('user:presence', { userId, status: 'OFFLINE', lastSeen: new Date() });
      this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`, 'ChatGateway');
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    if (data?.conversationId) {
      client.join(`conv:${data.conversationId}`);
      return { event: 'joined', conversationId: data.conversationId };
    }
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    if (data?.conversationId) {
      client.leave(`conv:${data.conversationId}`);
      return { event: 'left', conversationId: data.conversationId };
    }
  }

  @SubscribeMessage('send_message')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; senderId: string }
  ) {
    if (data?.conversationId) {
      const messagePayload = {
        ...data,
        id: `msg-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      this.server.to(`conv:${data.conversationId}`).emit('new_message', messagePayload);
      return messagePayload;
    }
  }
}
