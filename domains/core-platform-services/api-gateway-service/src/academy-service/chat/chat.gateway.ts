import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Server, Socket } from 'socket.io';
import { firstValueFrom, timeout } from 'rxjs';
import {
  CHAT_MESSAGE_PATTERNS,
  CHAT_WS_EVENTS,
  CHAT_WS_NAMESPACE,
  conversationRoom,
} from '@alikohub/chat';
import { ChatRealtimeService } from './chat-realtime.service';

type SocketUser = {
  firebaseId: string;
  email?: string;
  globalRole?: string;
  [key: string]: unknown;
};

@WebSocketGateway({
  namespace: CHAT_WS_NAMESPACE,
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    @Inject('ACADEMY_SERVICE') private academyClient: ClientProxy,
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
    private readonly realtime: ChatRealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);
    this.logger.log(`Chat WebSocket gateway ready on ${CHAT_WS_NAMESPACE}`);
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit(CHAT_WS_EVENTS.ERROR, { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      // DEBUG magic token (mirrors HTTP AuthGuard)
      if (token === 'debug-admin-token') {
        (client.data as { user: SocketUser }).user = {
          firebaseId: 'test-admin-id',
          email: 'admin@example.com',
          globalRole: 'ADMIN',
        };
        return;
      }

      const user = await this.verifyToken(token);
      if (!user?.firebaseId) {
        client.emit(CHAT_WS_EVENTS.ERROR, { message: 'Invalid token' });
        client.disconnect(true);
        return;
      }

      (client.data as { user: SocketUser }).user = user;
    } catch (error) {
      this.logger.warn(`WS auth failed: ${(error as Error).message}`);
      client.emit(CHAT_WS_EVENTS.ERROR, { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken) return authToken;

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken) return queryToken;

    return null;
  }

  private async verifyToken(token: string): Promise<SocketUser | null> {
    try {
      const jwtResponse = await firstValueFrom(
        this.authClient
          .send({ cmd: 'verify' }, { type: 'jwt', value: token })
          .pipe(timeout(5000)),
      );
      if (jwtResponse?.user) return jwtResponse.user;
    } catch {
      // fall through to Firebase token
    }

    try {
      const tokenResponse = await firstValueFrom(
        this.authClient
          .send({ cmd: 'verify' }, { type: 'token', value: token })
          .pipe(timeout(5000)),
      );
      if (tokenResponse?.user) return tokenResponse.user;
    } catch {
      return null;
    }

    return null;
  }

  private getUser(client: Socket): SocketUser {
    const user = (client.data as { user?: SocketUser }).user;
    if (!user?.firebaseId) {
      throw new Error('Unauthenticated socket');
    }
    return user;
  }

  @SubscribeMessage(CHAT_WS_EVENTS.JOIN_CONVERSATION)
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: number },
  ) {
    try {
      const user = this.getUser(client);
      const conversationId = Number(body?.conversationId);
      if (!conversationId) {
        client.emit(CHAT_WS_EVENTS.ERROR, { message: 'conversationId required' });
        return;
      }

      await firstValueFrom(
        this.academyClient
          .send(
            { cmd: CHAT_MESSAGE_PATTERNS.VERIFY_CONVERSATION_MEMBERSHIP },
            { conversationId, user },
          )
          .pipe(timeout(10000)),
      );

      await client.join(conversationRoom(conversationId));
      return { ok: true, conversationId };
    } catch (error) {
      client.emit(CHAT_WS_EVENTS.ERROR, {
        message: (error as Error)?.message || 'Failed to join conversation',
      });
    }
  }

  @SubscribeMessage(CHAT_WS_EVENTS.LEAVE_CONVERSATION)
  async leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: number },
  ) {
    const conversationId = Number(body?.conversationId);
    if (conversationId) {
      await client.leave(conversationRoom(conversationId));
    }
    return { ok: true };
  }

  @SubscribeMessage(CHAT_WS_EVENTS.SEND_MESSAGE)
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: number; body: string },
  ) {
    try {
      const user = this.getUser(client);
      const conversationId = Number(body?.conversationId);
      const text = (body?.body || '').trim();
      if (!conversationId || !text) {
        client.emit(CHAT_WS_EVENTS.ERROR, {
          message: 'conversationId and body are required',
        });
        return;
      }

      const message = await firstValueFrom(
        this.academyClient
          .send(
            { cmd: CHAT_MESSAGE_PATTERNS.SEND_MESSAGE },
            {
              conversationId,
              dto: { body: text },
              user,
            },
          )
          .pipe(timeout(10000)),
      );

      this.realtime.emitMessageCreated(conversationId, message);
      return message;
    } catch (error) {
      client.emit(CHAT_WS_EVENTS.ERROR, {
        message: (error as Error)?.message || 'Failed to send message',
      });
    }
  }
}
