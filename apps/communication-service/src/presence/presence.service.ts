import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  private onlineUsers = new Map<string, Set<string>>();

  setUserOnline(userId: string, socketId: string) {
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)!.add(socketId);
  }

  setUserOffline(userId: string, socketId?: string) {
    if (!this.onlineUsers.has(userId)) return;
    if (socketId) {
      this.onlineUsers.get(userId)!.delete(socketId);
      if (this.onlineUsers.get(userId)!.size === 0) {
        this.onlineUsers.delete(userId);
      }
    } else {
      this.onlineUsers.delete(userId);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }
}
