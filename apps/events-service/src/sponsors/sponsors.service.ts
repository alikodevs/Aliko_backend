import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateSponsorDto } from "./dto/create-sponsor.dto";
import { AuthenticatedUser, UserService } from "../user/user.service";
import { EventsRole } from "../generated/client";

@Injectable()
export class SponsorsService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  private async assertCanManageEvent(eventId: string, user: AuthenticatedUser) {
    const event = await this.prisma.post.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException("Event not found");

    const profile = await this.userService.getProfileAndSync(user);
    if (
      !profile ||
      (profile.role !== EventsRole.ADMIN && event.authorId !== user.firebaseId)
    ) {
      throw new ForbiddenException("Permission denied.");
    }
    return event;
  }

  async create(dto: CreateSponsorDto, user: AuthenticatedUser) {
    await this.assertCanManageEvent(dto.eventId, user);
    return this.prisma.sponsor.create({
      data: {
        eventId: dto.eventId,
        name: dto.name,
        tier: dto.tier,
        logoUrl: dto.logoUrl,
      },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) throw new NotFoundException("Sponsor not found");
    await this.assertCanManageEvent(sponsor.eventId, user);
    return this.prisma.sponsor.delete({ where: { id } });
  }
}
