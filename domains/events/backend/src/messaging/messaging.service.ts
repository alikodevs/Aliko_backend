import { Injectable, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { SendMessageDto, TargetAudience } from "./dto/send-message.dto";
import { EmailService } from "../common/email.service";
import { AuthenticatedUser, UserService } from "../user/user.service";
import { EventsRole } from "../generated/client";

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
  ) {}

  async sendMessage(id: string, dto: SendMessageDto, user: AuthenticatedUser) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        registrations: true,
        rsvps: true,
      },
    });

    if (!post) {
      throw new NotFoundException(`Event with ID ${id} not found.`);
    }

    const profile = await this.userService.getProfileAndSync(user);
    const isAdmin = profile?.role === EventsRole.ADMIN;
    if (post.authorId !== user.firebaseId && !isAdmin) {
      this.logger.warn(
        `User ${user.firebaseId} attempted to send message for event ${id} without permission.`,
      );
      throw new ForbiddenException(
        "Permission denied. Only the event author or an Admin can send broadcast messages.",
      );
    }

    let recipients: string[] = [];

    if (post.type === "EVENT") {
      if (dto.targetAudience === TargetAudience.ALL) {
        recipients = post.registrations.map((r) => r.attendeeEmail);
      } else if (dto.targetAudience === TargetAudience.CHECKED_IN) {
        recipients = post.registrations
          .filter((r) => r.isCheckedIn)
          .map((r) => r.attendeeEmail);
      } else if (dto.targetAudience === TargetAudience.NOT_CHECKED_IN) {
        recipients = post.registrations
          .filter((r) => !r.isCheckedIn)
          .map((r) => r.attendeeEmail);
      }
    } else if (post.type === "SOCIAL_EVENT") {
      if (dto.targetAudience === TargetAudience.ALL) {
        recipients = post.rsvps.map((r) => r.guestEmail);
      } else if (dto.targetAudience === TargetAudience.RSVP_YES) {
        recipients = post.rsvps
          .filter((r) => r.response === "yes")
          .map((r) => r.guestEmail);
      } else if (dto.targetAudience === TargetAudience.RSVP_MAYBE) {
        recipients = post.rsvps
          .filter((r) => r.response === "maybe")
          .map((r) => r.guestEmail);
      }
    }

    recipients = Array.from(new Set(recipients));

    this.logger.log(
      `Dispatching message: "${dto.subject}" to ${recipients.length} recipients for event ${post.title}`,
    );

    let sentCount = 0;
    for (const recipient of recipients) {
      this.logger.log(`Queueing email for ${recipient}`);
      const success = await this.emailService.sendEventMessageEmail(
        recipient,
        dto.subject,
        dto.body,
        post.title,
      );
      if (success) sentCount++;
    }

    await this.prisma.messageDispatch.create({
      data: {
        eventId: id,
        subject: dto.subject,
        recipientCount: recipients.length,
        sentCount,
        createdBy: user.firebaseId,
      },
    });

    return {
      success: true,
      sentCount,
      recipients: recipients.slice(0, 5),
      message: `Successfully dispatched to ${recipients.length} recipients.`,
    };
  }

  async getRecentStats(user?: AuthenticatedUser) {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const where: { createdAt?: { gte: Date }; createdBy?: string } = {
      createdAt: { gte: since },
    };

    if (user) {
      const profile = await this.userService.getProfileAndSync(user);
      if (profile && profile.role !== EventsRole.ADMIN) {
        where.createdBy = user.firebaseId;
      }
    }

    const dispatches = await this.prisma.messageDispatch.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    const totalSent = dispatches.reduce((sum, d) => sum + d.sentCount, 0);
    const totalRecipients = dispatches.reduce(
      (sum, d) => sum + d.recipientCount,
      0,
    );
    const deliveryRate =
      totalRecipients > 0
        ? Math.round((totalSent / totalRecipients) * 1000) / 10
        : 0;

    const byDay = new Map<string, number>();
    for (const d of dispatches) {
      const key = d.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + d.sentCount);
    }

    return {
      totalSent,
      deliveryRate,
      openRate: null as number | null, // Not tracked without email provider webhooks
      lastThirtyDays: Array.from(byDay.entries()).map(([date, count]) => ({
        date,
        count,
      })),
    };
  }
}
