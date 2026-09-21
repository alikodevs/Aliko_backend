import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PushNotificationService } from '@alikohub/notification';
import { Prisma } from '../generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { AuthenticatedUser, UserService } from '../user/user.service';

type NotificationMeta = Record<string, unknown>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly push = new PushNotificationService();

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  private displayName(user?: {
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
  } | null): string {
    const full = `${user?.firstname || ''} ${user?.lastname || ''}`.trim();
    return full || user?.email || 'Unknown user';
  }

  async createNotification(
    sender: AuthenticatedUser,
    dto: CreateNotificationDto,
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(sender);
    if (academyProfile.role === 'STUDENT') {
      throw new ForbiddenException('Students cannot create notifications.');
    }
    if (!dto.userId) {
      throw new ForbiddenException('Target userId is required');
    }

    const meta: NotificationMeta = {
      ...(dto.meta || {}),
      actorId: sender.firebaseId,
      actorName: this.displayName(sender),
    };

    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        message: dto.message,
        type: dto.type || 'general',
        isRead: false,
        meta: meta as Prisma.InputJsonValue,
      },
    });
  }

  async createProgressNotification(
    userId: string,
    message: string,
    meta?: NotificationMeta,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        message,
        type: 'progress',
        isRead: false,
        meta: (meta || {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * In-app + push notification for a new chat message.
   * Safe for any sender role (students included).
   */
  async notifyChatMessage(input: {
    recipientId: string;
    senderId: string;
    senderName: string;
    conversationId: number;
    messageId: number;
    preview: string;
  }) {
    const {
      recipientId,
      senderId,
      senderName,
      conversationId,
      messageId,
      preview,
    } = input;

    const message = `${senderName}: ${preview}`;

    const notification = await this.prisma.notification.create({
      data: {
        userId: recipientId,
        message,
        type: 'chat',
        isRead: false,
        meta: {
          conversationId,
          messageId,
          senderId,
          senderName,
          actorId: senderId,
          actorName: senderName,
        },
      },
    });

    try {
      await this.push.sendPushNotification(
        `user_${recipientId}`,
        'New message',
        message,
        {
          type: 'CHAT_MESSAGE',
          notificationId: String(notification.id),
          conversationId: String(conversationId),
          messageId: String(messageId),
          senderId,
        },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Chat push failed for ${recipientId}: ${msg}`);
    }

    return notification;
  }

  async notifyInstructorProgress(
    studentId: string,
    courseId: number,
    moduleTitle: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) return;

    const student = await this.userService.getUserById(studentId);
    if (!student) return;

    const studentName = `${student.firstname} ${student.lastname}`.trim();
    const message = `${studentName} completed module "${moduleTitle}" in "${course.title}".`;

    return this.prisma.notification.create({
      data: {
        userId: course.instructorId,
        message,
        type: 'progress',
        isRead: false,
        meta: {
          studentId,
          studentName,
          courseId,
          courseTitle: course.title,
          moduleTitle,
          actorId: studentId,
          actorName: studentName,
        },
      },
    });
  }

  async getNotificationById(user: AuthenticatedUser, id: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== user.firebaseId) {
      throw new ForbiddenException(
        'You are not allowed to view this notification',
      );
    }

    return this.buildNotificationDetail(notification);
  }

  async getUserNotifications(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.firebaseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Enrich any notification with resolved related entities from meta.
   */
  private async buildNotificationDetail(notification: {
    id: number;
    userId: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: Date;
    meta: Prisma.JsonValue | null;
  }) {
    const meta = (notification.meta || {}) as NotificationMeta;
    const details: Record<string, unknown> = {};

    const actorId =
      (typeof meta.actorId === 'string' && meta.actorId) ||
      (typeof meta.senderId === 'string' && meta.senderId) ||
      (typeof meta.studentId === 'string' && meta.studentId) ||
      null;

    if (actorId) {
      const actor = await this.userService.getUserById(actorId);
      details.actor = actor
        ? {
            userId: actor.firebaseId,
            name: this.displayName(actor),
            firstname: actor.firstname,
            lastname: actor.lastname,
            email: actor.email,
          }
        : {
            userId: actorId,
            name:
              (typeof meta.actorName === 'string' && meta.actorName) ||
              (typeof meta.senderName === 'string' && meta.senderName) ||
              (typeof meta.studentName === 'string' && meta.studentName) ||
              null,
          };
    }

    const courseId = Number(meta.courseId);
    if (Number.isFinite(courseId) && courseId > 0) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          title: true,
          instructorId: true,
          status: true,
          category: true,
        },
      });
      details.course = course || {
        id: courseId,
        title:
          typeof meta.courseTitle === 'string' ? meta.courseTitle : null,
      };
    }

    if (typeof meta.moduleTitle === 'string') {
      details.moduleTitle = meta.moduleTitle;
    }

    if (typeof meta.studentId === 'string') {
      details.student = details.actor || {
        userId: meta.studentId,
        name:
          typeof meta.studentName === 'string' ? meta.studentName : null,
      };
    }

    const conversationId = Number(meta.conversationId);
    const messageId = Number(meta.messageId);
    if (
      notification.type === 'chat' ||
      (Number.isFinite(conversationId) && conversationId > 0)
    ) {
      const chat: Record<string, unknown> = {
        conversationId:
          Number.isFinite(conversationId) && conversationId > 0
            ? conversationId
            : null,
        messageId:
          Number.isFinite(messageId) && messageId > 0 ? messageId : null,
        senderId:
          typeof meta.senderId === 'string' ? meta.senderId : actorId,
        senderName:
          typeof meta.senderName === 'string' ? meta.senderName : null,
      };

      if (details.actor) {
        chat.sender = details.actor;
      }

      if (Number.isFinite(messageId) && messageId > 0) {
        const chatMessage = await this.prisma.message.findUnique({
          where: { id: messageId },
        });
        if (chatMessage) {
          chat.messageBody = chatMessage.body;
          chat.sentAt = chatMessage.createdAt;
        }
      }

      details.chat = chat;
    }

    // Pass through any remaining useful meta keys as-is under details.extra
    const reserved = new Set([
      'actorId',
      'actorName',
      'senderId',
      'senderName',
      'studentId',
      'studentName',
      'courseId',
      'courseTitle',
      'moduleTitle',
      'conversationId',
      'messageId',
    ]);
    const extra: NotificationMeta = {};
    for (const [key, value] of Object.entries(meta)) {
      if (!reserved.has(key)) extra[key] = value;
    }
    if (Object.keys(extra).length > 0) {
      details.extra = extra;
    }

    return {
      id: notification.id,
      userId: notification.userId,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      meta: notification.meta,
      details,
    };
  }

  async markAsRead(user: AuthenticatedUser, notificationId: number) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notif || notif.userId !== user.firebaseId) {
      throw new ForbiddenException(
        'You are not allowed to mark this notification as read.',
      );
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async deleteNotification(user: AuthenticatedUser, notificationId: number) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notif) throw new NotFoundException('Notification not found');

    if (academyProfile.role === 'STUDENT') {
      throw new ForbiddenException('Students cannot delete notifications.');
    }

    return this.prisma.notification.delete({ where: { id: notificationId } });
  }
}
