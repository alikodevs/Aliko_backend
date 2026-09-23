import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ChatPolicyService,
  pairKeyForUsers,
} from '@alikohub/chat';
import { AcademyRole, EnrollmentStatus, Prisma } from '../generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { StartConversationDto, SendMessageDto } from './dto/chat.dto';
import { NotificationsService } from '../notifications/notifications.service';

/** Token/user payload fields used only inside chat for session role resolution */
type ChatAuthUser = AuthenticatedUser & {
  academyActiveRole?: string;
  academyRole?: string;
  academyUser?: {
    role?: string;
    activeRole?: string | null;
  };
};

type ConversationWithRelations = Prisma.ConversationGetPayload<{
  include: {
    participants: true;
    messages: true;
    course: { select: { id: true; title: true } };
  };
}>;

const conversationInclude = {
  participants: true,
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
  course: {
    select: { id: true, title: true },
  },
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly chatPolicy: ChatPolicyService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Active session role for chat only.
   * Dual-role users: NEVER use base academyRole / academyUser.role here —
   * that was causing STUDENT sessions to get INSTRUCTOR chat (and vice versa).
   */
  private normalizeChatRole(raw?: string | null): AcademyRole | null {
    if (!raw) return null;
    const role = String(raw).toUpperCase();
    if (role === 'TEACHER') return AcademyRole.INSTRUCTOR;
    if (role === AcademyRole.STUDENT) return AcademyRole.STUDENT;
    if (role === AcademyRole.INSTRUCTOR) return AcademyRole.INSTRUCTOR;
    if (role === AcademyRole.ADMIN) return AcademyRole.ADMIN;
    if (role === AcademyRole.COURSE_MANAGER) return AcademyRole.COURSE_MANAGER;
    if (role === AcademyRole.USER) return AcademyRole.USER;
    return null;
  }

  private async resolveCallerSessionRole(
    user: ChatAuthUser,
  ): Promise<AcademyRole> {
    if (user.globalRole === 'ADMIN') {
      return AcademyRole.ADMIN;
    }

    // 1) Token / request session fields only (active), never base role
    const fromToken =
      user.academyActiveRole ||
      user.activeRole ||
      user.academyUser?.activeRole ||
      null;

    const tokenRole = this.normalizeChatRole(
      fromToken != null ? String(fromToken) : null,
    );
    if (tokenRole && tokenRole !== AcademyRole.USER) {
      return tokenRole;
    }

    // 2) Profile after auth sync — syncFromAuth writes activeRole into profile.role
    const profile = await this.getSenderProfile(user);
    const profileRole = this.normalizeChatRole(profile.role);
    if (profileRole && profileRole !== AcademyRole.USER) {
      return profileRole;
    }

    return profileRole || AcademyRole.USER;
  }

  private displayName(user?: {
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
  } | null): string {
    const full = `${user?.firstname || ''} ${user?.lastname || ''}`.trim();
    return full || user?.email || 'Unknown user';
  }

  private async formatConversationThread(
    conversation: ConversationWithRelations,
    viewerId: string,
    viewerSessionRole?: string,
  ) {
    const userIds = [
      ...new Set([
        ...conversation.participants.map((p) => p.userId),
        ...conversation.messages.map((m) => m.senderId),
      ]),
    ];
    const users = await this.userService.getUsersByIds(userIds);
    const byId = new Map(users.map((u) => [u.firebaseId, u]));

    const participants = conversation.participants.map((p) => {
      const auth = byId.get(p.userId) as ChatAuthUser | undefined;
      // Viewer: always show their current session role from the token
      const role =
        p.userId === viewerId && viewerSessionRole
          ? viewerSessionRole
          : p.role;
      return {
        userId: p.userId,
        name: this.displayName(auth),
        firstname: auth?.firstname ?? null,
        lastname: auth?.lastname ?? null,
        email: auth?.email ?? null,
        role,
        lastReadAt: p.lastReadAt,
        joinedAt: p.joinedAt,
      };
    });

    const other = participants.find((p) => p.userId !== viewerId) ?? null;
    const me = participants.find((p) => p.userId === viewerId) ?? null;
    const lastRaw = conversation.messages[0] ?? null;
    const lastSender = lastRaw ? byId.get(lastRaw.senderId) : null;

    return {
      conversationId: conversation.id,
      title: other ? `Chat with ${other.name}` : 'Conversation',
      with: other
        ? {
            userId: other.userId,
            name: other.name,
            firstname: other.firstname,
            lastname: other.lastname,
            email: other.email,
            role: other.role,
          }
        : null,
      me: me
        ? {
            userId: me.userId,
            name: me.name,
            role: me.role,
            lastReadAt: me.lastReadAt,
          }
        : null,
      participants,
      course: conversation.course
        ? {
            id: conversation.course.id,
            title: conversation.course.title,
          }
        : null,
      lastMessage: lastRaw
        ? {
            id: lastRaw.id,
            body: lastRaw.body,
            sentAt: lastRaw.createdAt,
            sender: {
              userId: lastRaw.senderId,
              name: this.displayName(lastSender),
            },
          }
        : null,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  private async getSenderProfile(user: AuthenticatedUser) {
    return this.userService.getOrCreateProfile(user);
  }

  private async getRecipientProfile(recipientId: string) {
    const profile = await this.prisma.academyProfile.findUnique({
      where: { userId: recipientId },
    });
    if (!profile) {
      throw new NotFoundException('Recipient academy profile not found');
    }
    return profile;
  }

  async findEnrollmentLink(
    studentId: string,
    instructorId: string,
    courseId?: number,
  ): Promise<{ linked: boolean; courseId?: number }> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: studentId,
        status: EnrollmentStatus.ACTIVE,
        course: {
          instructorId,
          ...(courseId ? { id: courseId } : {}),
        },
      },
      select: { courseId: true },
    });
    return {
      linked: !!enrollment,
      courseId: enrollment?.courseId,
    };
  }

  private async assertCanChat(
    senderRole: string,
    recipientRole: string,
    senderId: string,
    recipientId: string,
    courseId?: number,
  ): Promise<number | undefined> {
    if (senderId === recipientId) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }

    let hasEnrollmentLink = false;
    let resolvedCourseId = courseId;

    if (this.chatPolicy.requiresEnrollmentLink(senderRole, recipientRole)) {
      const studentId =
        senderRole === 'STUDENT' ? senderId : recipientId;
      const instructorId =
        senderRole === 'INSTRUCTOR' ? senderId : recipientId;
      const link = await this.findEnrollmentLink(
        studentId,
        instructorId,
        courseId,
      );
      hasEnrollmentLink = link.linked;
      resolvedCourseId = link.courseId ?? courseId;
    }

    const allowed = this.chatPolicy.canStartDirectChat({
      senderRole,
      recipientRole,
      hasEnrollmentLink,
    });

    if (!allowed) {
      throw new ForbiddenException(
        'You are not allowed to chat with this user',
      );
    }

    return resolvedCourseId;
  }

  async startOrGetConversation(
    user: AuthenticatedUser,
    dto: StartConversationDto,
  ) {
    const sender = await this.getSenderProfile(user);
    const recipient = await this.getRecipientProfile(dto.recipientId);
    const senderRole = await this.resolveCallerSessionRole(user as ChatAuthUser);

    const courseId = await this.assertCanChat(
      senderRole,
      recipient.role,
      sender.userId,
      recipient.userId,
      dto.courseId,
    );

    const pairKey = pairKeyForUsers(sender.userId, recipient.userId);

    const existing = await this.prisma.conversation.findUnique({
      where: { pairKey },
      include: conversationInclude,
    });

    if (existing) {
      return this.formatConversationThread(
        existing,
        sender.userId,
        senderRole,
      );
    }

    const created = await this.prisma.conversation.create({
      data: {
        pairKey,
        courseId: courseId ?? null,
        participants: {
          create: [
            { userId: sender.userId, role: senderRole },
            { userId: recipient.userId, role: recipient.role },
          ],
        },
      },
      include: conversationInclude,
    });

    return this.formatConversationThread(
      created,
      sender.userId,
      senderRole,
    );
  }

  private async assertParticipant(
    conversationId: number,
    userId: string,
  ) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }
    return participant;
  }

  async verifyMembership(user: AuthenticatedUser, conversationId: number) {
    await this.assertParticipant(conversationId, user.firebaseId);
    return { ok: true, conversationId };
  }

  async listMyConversations(user: AuthenticatedUser) {
    const senderRole = await this.resolveCallerSessionRole(user as ChatAuthUser);
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId: user.firebaseId } },
      },
      include: conversationInclude,
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = await Promise.all(
      conversations.map((c) =>
        this.formatConversationThread(c, user.firebaseId, senderRole),
      ),
    );

    // One thread per other person (keep most recently updated)
    const byPeer = new Map<string, (typeof formatted)[number]>();
    for (const thread of formatted) {
      const peerId = thread.with?.userId;
      if (!peerId || peerId === user.firebaseId) continue;
      if (!byPeer.has(peerId)) {
        byPeer.set(peerId, thread);
      }
    }

    return [...byPeer.values()];
  }

  async listMessages(
    user: AuthenticatedUser,
    conversationId: number,
    cursor?: number,
    limit = 50,
  ) {
    await this.assertParticipant(conversationId, user.firebaseId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const users = await this.userService.getUsersByIds(senderIds);
    const byId = new Map(users.map((u) => [u.firebaseId, u]));

    return {
      conversationId,
      messages: messages.map((m) => {
        const sender = byId.get(m.senderId);
        return {
          id: m.id,
          body: m.body,
          sentAt: m.createdAt,
          sender: {
            userId: m.senderId,
            name: this.displayName(sender),
            firstname: sender?.firstname ?? null,
            lastname: sender?.lastname ?? null,
          },
          mine: m.senderId === user.firebaseId,
        };
      }),
    };
  }

  async sendMessage(
    user: AuthenticatedUser,
    conversationId: number,
    dto: SendMessageDto,
  ) {
    await this.assertParticipant(conversationId, user.firebaseId);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: user.firebaseId,
          body: dto.body.trim(),
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    const recipients = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: user.firebaseId },
      },
    });

    const preview =
      dto.body.length > 120 ? `${dto.body.slice(0, 117)}...` : dto.body;

    const sender = await this.userService.getUserById(user.firebaseId);
    const senderName = this.displayName(sender ?? user);

    await Promise.all(
      recipients.map((r) =>
        this.notificationsService.notifyChatMessage({
          recipientId: r.userId,
          senderId: user.firebaseId,
          senderName,
          conversationId,
          messageId: message.id,
          preview,
        }),
      ),
    );

    return {
      id: message.id,
      conversationId: message.conversationId,
      body: message.body,
      sentAt: message.createdAt,
      sender: {
        userId: message.senderId,
        name: senderName,
        firstname: sender?.firstname ?? user.firstname ?? null,
        lastname: sender?.lastname ?? user.lastname ?? null,
      },
      mine: true,
    };
  }

  async markRead(user: AuthenticatedUser, conversationId: number) {
    await this.assertParticipant(conversationId, user.firebaseId);

    return this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.firebaseId,
        },
      },
      data: { lastReadAt: new Date() },
    });
  }

  async listEligibleContacts(user: AuthenticatedUser) {
    const sender = await this.getSenderProfile(user);
    // Session active role only — never base instructor/student membership role
    const role = await this.resolveCallerSessionRole(user as ChatAuthUser);

    if (role === AcademyRole.ADMIN) {
      const profiles = await this.prisma.academyProfile.findMany({
        where: {
          userId: { not: sender.userId },
          role: {
            in: [
              AcademyRole.STUDENT,
              AcademyRole.INSTRUCTOR,
              AcademyRole.ADMIN,
              AcademyRole.USER,
              AcademyRole.COURSE_MANAGER,
            ],
          },
        },
        select: { userId: true, role: true },
      });
      return this.enrichContacts(profiles, sender.userId);
    }

    if (role === AcademyRole.STUDENT) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          userId: sender.userId,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          course: { select: { id: true, title: true, instructorId: true } },
        },
      });

      const instructorMap = new Map<
        string,
        { userId: string; role: AcademyRole; courseIds: number[] }
      >();
      for (const e of enrollments) {
        const id = e.course.instructorId;
        if (!id || id === sender.userId) continue;
        const existing = instructorMap.get(id);
        if (existing) {
          existing.courseIds.push(e.courseId);
        } else {
          instructorMap.set(id, {
            userId: id,
            role: AcademyRole.INSTRUCTOR,
            courseIds: [e.courseId],
          });
        }
      }

      const admins = await this.prisma.academyProfile.findMany({
        where: {
          role: AcademyRole.ADMIN,
          userId: { not: sender.userId },
        },
        select: { userId: true, role: true },
      });

      const peers = await this.prisma.academyProfile.findMany({
        where: {
          role: AcademyRole.STUDENT,
          userId: { not: sender.userId },
        },
        select: { userId: true, role: true },
        take: 100,
      });

      const contacts = [
        ...Array.from(instructorMap.values()).map((i) => ({
          userId: i.userId,
          role: i.role,
          courseIds: i.courseIds,
        })),
        ...admins.map((a) => ({ userId: a.userId, role: a.role })),
        ...peers.map((p) => ({ userId: p.userId, role: p.role })),
      ];

      return this.enrichContacts(contacts, sender.userId);
    }

    if (role === AcademyRole.INSTRUCTOR) {
      const courses = await this.prisma.course.findMany({
        where: { instructorId: sender.userId },
        select: { id: true },
      });
      const courseIds = courses.map((c) => c.id);

      const enrollments = courseIds.length
        ? await this.prisma.enrollment.findMany({
            where: {
              courseId: { in: courseIds },
              status: EnrollmentStatus.ACTIVE,
              userId: { not: sender.userId },
            },
            select: { userId: true, courseId: true },
          })
        : [];

      const studentMap = new Map<
        string,
        { userId: string; role: AcademyRole; courseIds: number[] }
      >();
      for (const e of enrollments) {
        if (!e.userId || e.userId === sender.userId) continue;
        const existing = studentMap.get(e.userId);
        if (existing) {
          existing.courseIds.push(e.courseId);
        } else {
          studentMap.set(e.userId, {
            userId: e.userId,
            role: AcademyRole.STUDENT,
            courseIds: [e.courseId],
          });
        }
      }

      const admins = await this.prisma.academyProfile.findMany({
        where: {
          role: AcademyRole.ADMIN,
          userId: { not: sender.userId },
        },
        select: { userId: true, role: true },
      });

      const peerInstructors = await this.prisma.academyProfile.findMany({
        where: {
          role: AcademyRole.INSTRUCTOR,
          userId: { not: sender.userId },
        },
        select: { userId: true, role: true },
        take: 100,
      });

      const contacts = [
        ...Array.from(studentMap.values()),
        ...admins.map((a) => ({ userId: a.userId, role: a.role })),
        ...peerInstructors.map((p) => ({ userId: p.userId, role: p.role })),
      ];

      return this.enrichContacts(contacts, sender.userId);
    }

    if (role === AcademyRole.USER || role === AcademyRole.COURSE_MANAGER) {
      const admins = await this.prisma.academyProfile.findMany({
        where: {
          role: AcademyRole.ADMIN,
          userId: { not: sender.userId },
        },
        select: { userId: true, role: true },
      });

      return this.enrichContacts(admins, sender.userId);
    }

    return [];
  }

  private async enrichContacts(
    contacts: Array<{
      userId: string;
      role: AcademyRole | string;
      courseIds?: number[];
    }>,
    viewerId: string,
  ) {
    // Never include yourself; keep one entry per userId
    const byUserId = new Map<
      string,
      { userId: string; role: AcademyRole | string; courseIds?: number[] }
    >();
    for (const c of contacts) {
      if (!c.userId || c.userId === viewerId) continue;
      const existing = byUserId.get(c.userId);
      if (!existing) {
        byUserId.set(c.userId, {
          userId: c.userId,
          role: c.role,
          courseIds: c.courseIds ? [...c.courseIds] : undefined,
        });
      } else if (c.courseIds?.length) {
        const merged = new Set([
          ...(existing.courseIds || []),
          ...c.courseIds,
        ]);
        existing.courseIds = [...merged];
      }
    }

    const unique = [...byUserId.values()];
    const users = await this.userService.getUsersByIds(
      unique.map((c) => c.userId),
    );
    const byId = new Map(users.map((u) => [u.firebaseId, u]));

    return unique.map((c) => {
      const auth = byId.get(c.userId);
      return {
        userId: c.userId,
        name: this.displayName(auth),
        role: c.role,
        courseIds: c.courseIds,
        email: auth?.email ?? null,
        firstname: auth?.firstname ?? null,
        lastname: auth?.lastname ?? null,
      };
    });
  }
}
