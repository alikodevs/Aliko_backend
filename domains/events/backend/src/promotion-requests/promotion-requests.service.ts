import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreatePromotionRequestDto } from "./dto/create-promotion-request.dto";
import { AuthenticatedUser, UserService } from "../user/user.service";
import { EventsRole } from "../generated/client";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class PromotionRequestsService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    @Inject("AUTH_SERVICE") private authClient: ClientProxy,
  ) {}

  async create(dto: CreatePromotionRequestDto, userId?: string) {
    const request = await this.prisma.promotionRequest.create({
      data: {
        companyName: dto.companyName,
        contactPerson: dto.contactPerson,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        organization: dto.organization,
        event_type: dto.event_type,
        estimatedAttendees: dto.estimatedAttendees,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
        location: dto.location,
        type: dto.type as any,
        message: dto.message,
        userId: userId || null,
      },
    });

    // Notify Admin via Auth Service (Email)
    this.authClient.emit("send_contact_email", {
      name: dto.contactPerson,
      email: dto.email,
      subject: `New Promotion Request: ${dto.companyName}`,
      message: `
        Company: ${dto.companyName}
        Contact: ${dto.contactPerson}
        Phone: ${dto.phoneNumber || "N/A"}
        Type: ${dto.type}
        Org: ${dto.organization || "N/A"}
        Event Type: ${dto.event_type || "N/A"}
        Estimated Attendees: ${dto.estimatedAttendees || "N/A"}
        Preferred Date: ${dto.preferredDate || "N/A"}
        Location: ${dto.location || "N/A"}

        Details: ${dto.message}
      `,
    });

    return request;
  }

  async findAll(user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || profile.role !== EventsRole.ADMIN) {
      throw new ForbiddenException("Only admins can view promotion requests.");
    }

    return this.prisma.promotionRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async findMyRequests(userId: string) {
    return this.prisma.promotionRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async markAsReviewed(id: string, user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || profile.role !== EventsRole.ADMIN) {
      throw new ForbiddenException(
        "Only admins can mark requests as reviewed.",
      );
    }

    const request = await this.prisma.promotionRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException("Request not found");

    return this.prisma.promotionRequest.update({
      where: { id },
      data: { status: "REVIEWED" },
    });
  }

  async convertToEvent(id: string, user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || profile.role !== EventsRole.ADMIN) {
      throw new ForbiddenException("Only admins can convert proposals.");
    }

    const request = await this.prisma.promotionRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException("Proposal not found");

    // Create a new Post (Event) from the proposal
    const post = await this.prisma.post.create({
      data: {
        type: request.type,
        title: `Draft: ${request.companyName} Event`,
        excerpt: `Proposal from ${request.contactPerson} (${request.organization || request.companyName})`,
        content: request.message,
        status: "DRAFT",
        authorId: user.firebaseId,
        location: request.location,
        eventDate: request.preferredDate,
      },
    });

    // Mark proposal as converted
    await this.prisma.promotionRequest.update({
      where: { id },
      data: { status: "CONVERTED" },
    });

    return post;
  }
}
