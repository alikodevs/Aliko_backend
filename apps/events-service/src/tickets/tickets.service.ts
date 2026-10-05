import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { AuthenticatedUser, UserService } from "../user/user.service";
import { EventsRole, PostType } from "../generated/client";

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(createTicketDto: CreateTicketDto, user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || (profile.role !== EventsRole.ADMIN && profile.role !== EventsRole.CONTENT_MANAGER)) {
      throw new ForbiddenException("Permission denied.");
    }

    const event = await this.prisma.post.findUnique({
      where: { id: createTicketDto.eventId },
    });

    if (!event) throw new NotFoundException("Event not found");

    if (profile.role !== EventsRole.ADMIN && event.authorId !== user.firebaseId) {
      throw new ForbiddenException("You can only manage tickets for your own events.");
    }

    if (event.type !== PostType.EVENT) {
      throw new ForbiddenException("Tickets can only be added to events.");
    }

    return this.prisma.ticket.create({
      data: createTicketDto,
    });
  }

  async findAllForEvent(eventId: string) {
    return this.prisma.ticket.findMany({
      where: { eventId, isActive: true },
      orderBy: { price: "asc" },
    });
  }

  async findAllForUser(user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);
    if (!profile) throw new ForbiddenException("No events profile found.");

    const where: any = { isActive: true };
    if (profile.role !== EventsRole.ADMIN) {
      where.event = { authorId: user.firebaseId };
    }

    return this.prisma.ticket.findMany({
      where,
      include: {
        event: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, dto: { name?: string, price?: number, quantity?: number }, user: AuthenticatedUser) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!ticket) throw new NotFoundException("Ticket not found");

    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || (profile.role !== EventsRole.ADMIN && ticket.event.authorId !== user.firebaseId)) {
      throw new ForbiddenException("Permission denied.");
    }

    return this.prisma.ticket.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!ticket) throw new NotFoundException("Ticket not found");

    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || (profile.role !== EventsRole.ADMIN && ticket.event.authorId !== user.firebaseId)) {
      throw new ForbiddenException("Permission denied.");
    }

    // Soft delete if registrations exist, or hard delete
    const registrationsCount = await this.prisma.registration.count({
      where: { ticketId: id },
    });

    if (registrationsCount > 0) {
      return this.prisma.ticket.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.ticket.delete({
      where: { id },
    });
  }
}
