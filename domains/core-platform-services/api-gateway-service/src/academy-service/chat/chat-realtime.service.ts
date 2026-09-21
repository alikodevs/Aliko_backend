import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { CHAT_WS_EVENTS, conversationRoom } from '@alikohub/chat';

/**
 * Allows REST handlers to push realtime events into Socket.IO rooms.
 * ChatGateway registers the Server instance on init.
 */
@Injectable()
export class ChatRealtimeService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitMessageCreated(conversationId: number, message: unknown) {
    if (!this.server) return;
    this.server
      .to(conversationRoom(conversationId))
      .emit(CHAT_WS_EVENTS.MESSAGE_CREATED, message);
  }

  emitMessageRead(conversationId: number, payload: unknown) {
    if (!this.server) return;
    this.server
      .to(conversationRoom(conversationId))
      .emit(CHAT_WS_EVENTS.MESSAGE_READ, payload);
  }
}
