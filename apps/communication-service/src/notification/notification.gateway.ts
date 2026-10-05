import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const userId = (client.handshake.query.userId as string) || (client.handshake.auth?.userId as string);
    if (userId) {
      client.join(`notifications:${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    // Clean up
  }

  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`notifications:${userId}`).emit('notification', notification);
  }
}
