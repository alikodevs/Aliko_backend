import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../database/prisma.service";
import { CreateRegistrationDto } from "./dto/create-registration.dto";
import { AuthenticatedUser, UserService } from "../user/user.service";
import { EventsRole } from "../generated/client";
import { EmailService } from "../common/email.service";

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private emailService: EmailService,
  ) {}

  private isVirtualEvent(event: any): boolean {
    const externalLink = event?.externalLink?.trim();
    const location = event?.location?.trim() || '';
    const locationAddress = event?.locationAddress?.trim() || '';
    const isUrl = (str: string) => /^https?:\/\//i.test(str);
    const virtualRegex = /(zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com|virtual|online|live\s*stream|webinar)/i;

    if (externalLink && externalLink.length > 0) return true;
    if (isUrl(location)) return true;
    if (virtualRegex.test(location) || virtualRegex.test(locationAddress)) return true;
    return false;
  }

  async create(createRegistrationDto: CreateRegistrationDto, user?: AuthenticatedUser) {
    const event = await this.prisma.post.findUnique({
      where: { id: createRegistrationDto.eventId },
      include: { tickets: { where: { isActive: true } } },
    });

    if (!event) throw new NotFoundException("Event not found");

    const isVirtual = this.isVirtualEvent(event);
    const activeTickets = event.tickets || [];

    // For in-person events with active ticket tiers, a ticketId is required.
    // For virtual events, ticketId is optional (allows free virtual meeting access).
    if (!isVirtual && activeTickets.length > 0 && !createRegistrationDto.ticketId) {
      throw new BadRequestException(
        "A ticketId is required because this event has active ticket tiers.",
      );
    }

    let totalPaid = 0;
    let paymentStatus = "paid";
    let selectedTicket: any = null;

    if (createRegistrationDto.ticketId) {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: createRegistrationDto.ticketId },
      });

      if (!ticket) throw new NotFoundException("Selected ticket does not exist.");
      if (ticket.eventId !== createRegistrationDto.eventId) {
        throw new ForbiddenException("The selected ticket does not belong to this event.");
      }
      if (!ticket.isActive) {
        throw new ForbiddenException("The selected ticket is no longer available.");
      }

      const usedQuantity = await this.prisma.registration.count({
        where: { ticketId: createRegistrationDto.ticketId },
      });
      if (usedQuantity >= ticket.quantity) {
        throw new ForbiddenException("This ticket tier is sold out.");
      }

      selectedTicket = ticket;
      totalPaid = ticket.price;
      // No payment gateway yet: free tickets are paid; priced tickets stay pending until paid.
      paymentStatus = ticket.price > 0 ? "pending" : "paid";
    }

    const qrCodeValue =
      paymentStatus === "paid" ? `REG-${randomUUID()}` : null;

    const { totalPaid: _ignored, ...dtoRest } = createRegistrationDto as CreateRegistrationDto & {
      totalPaid?: number;
    };

    const registration = await this.prisma.registration.create({
      data: {
        ...dtoRest,
        userId: user?.firebaseId || null,
        totalPaid,
        paymentStatus,
        qrCodeValue,
      },
    });

    // Send confirmation email asynchronously / safely (Virtual meeting link or In-person confirmation)
    try {
      await this.emailService.sendRegistrationEmail(
        registration.attendeeEmail,
        registration.attendeeName,
        event,
        registration,
        selectedTicket,
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to send registration confirmation email to ${registration.attendeeEmail}: ${err.message}`,
      );
    }

    return registration;
  }

  async findAllForMyEvents(user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);
    if (!profile) throw new ForbiddenException("No events profile found.");

    let where: any = {};
    if (profile.role !== EventsRole.ADMIN) {
      where = { event: { authorId: user.firebaseId } };
    }

    return this.prisma.registration.findMany({
      where,
      include: {
        event: {
          select: { title: true }
        },
        ticket: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async toggleCheckIn(id: string, user: AuthenticatedUser) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!registration) throw new NotFoundException("Registration not found");

    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || (profile.role !== EventsRole.ADMIN && registration.event.authorId !== user.firebaseId)) {
      throw new ForbiddenException("Permission denied.");
    }

    // Idempotent check-in (same as checkIn) — does not undo a prior check-in.
    if (registration.isCheckedIn) {
      return registration;
    }

    return this.prisma.registration.update({
      where: { id },
      data: {
        isCheckedIn: true,
        checkedInAt: new Date(),
      },
    });
  }

  async findAllMyRegistrations(user: AuthenticatedUser) {
    return this.prisma.registration.findMany({
      where: { userId: user.firebaseId },
      include: {
        event: true,
        ticket: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findForEvent(eventId: string, user: AuthenticatedUser) {
    const event = await this.prisma.post.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException("Event not found");

    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || (profile.role !== EventsRole.ADMIN && event.authorId !== user.firebaseId)) {
      throw new ForbiddenException("Permission denied.");
    }

    return this.prisma.registration.findMany({
      where: { eventId },
      include: {
        ticket: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async checkIn(id: string, eventId: string, user: AuthenticatedUser) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!registration) throw new NotFoundException("Registration not found");
    if (registration.eventId !== eventId) throw new ForbiddenException("Registration does not belong to this event");

    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || (profile.role !== EventsRole.ADMIN && registration.event.authorId !== user.firebaseId)) {
      throw new ForbiddenException("Permission denied.");
    }

    return this.prisma.registration.update({
      where: { id },
      data: {
        isCheckedIn: true,
        checkedInAt: new Date(),
      },
    });
  }
}
