import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateRsvpDto } from "./dto/create-rsvp.dto";
import { AuthenticatedUser, UserService } from "../user/user.service";
import { EventsRole } from "../generated/client";
import { EmailService } from "../common/email.service";

@Injectable()
export class RsvpsService {
  private readonly logger = new Logger(RsvpsService.name);

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private emailService: EmailService
  ) {}

  async create(createRsvpDto: CreateRsvpDto) {
    const event = await this.prisma.post.findUnique({
      where: { id: createRsvpDto.eventId },
    });

    if (!event) throw new NotFoundException("Event not found");

    if (event.type !== "SOCIAL_EVENT") {
      throw new ForbiddenException("RSVPs are only available for social events. Use registrations for professional events.");
    }

    const createdRsvp = await this.prisma.rSVP.create({
      data: createRsvpDto,
    });

    // Send confirmation email with interactive RSVP confirmation links
    try {
      await this.emailService.sendRsvpConfirmationEmail(
        createdRsvp.guestEmail,
        createdRsvp.guestName,
        event.title,
        event.eventDate ? event.eventDate.toISOString() : "",
        createdRsvp.response,
        createdRsvp.id,
        event.slug || event.id,
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to send RSVP confirmation email to ${createdRsvp.guestEmail}: ${err.message}`,
      );
    }

    return createdRsvp;
  }

  async updateStatus(id: string, response: string) {
    const validResponses = ["yes", "no", "maybe"];
    const normalizedResponse = response?.toLowerCase()?.trim();
    if (!validResponses.includes(normalizedResponse)) {
      throw new BadRequestException(`Invalid RSVP response '${response}'. Must be one of: yes, no, maybe`);
    }

    const existingRsvp = await this.prisma.rSVP.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!existingRsvp) {
      throw new NotFoundException("RSVP record not found");
    }

    const updatedRsvp = await this.prisma.rSVP.update({
      where: { id },
      data: {
        response: normalizedResponse,
      },
    });

    // Send updated confirmation email
    try {
      if (existingRsvp.event) {
        await this.emailService.sendRsvpConfirmationEmail(
          updatedRsvp.guestEmail,
          updatedRsvp.guestName,
          existingRsvp.event.title,
          existingRsvp.event.eventDate ? existingRsvp.event.eventDate.toISOString() : "",
          updatedRsvp.response,
          updatedRsvp.id,
          existingRsvp.event.slug || existingRsvp.event.id,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to send updated RSVP email to ${updatedRsvp.guestEmail}: ${err.message}`,
      );
    }

    return updatedRsvp;
  }

  async findAllForMyEvents(user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);
    if (!profile) throw new ForbiddenException("No events profile found.");

    let where: any = {};
    if (profile.role !== EventsRole.ADMIN) {
      where = { event: { authorId: user.firebaseId } };
    }

    return this.prisma.rSVP.findMany({
      where,
      include: {
        event: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const rsvp = await this.prisma.rSVP.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!rsvp) throw new NotFoundException("RSVP not found");

    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || (profile.role !== EventsRole.ADMIN && rsvp.event.authorId !== user.firebaseId)) {
      throw new ForbiddenException("Permission denied.");
    }

    return this.prisma.rSVP.delete({
      where: { id },
    });
  }
}
