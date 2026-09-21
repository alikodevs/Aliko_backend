import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateSessionDto } from "./dto/create-session.dto";
import { AuthenticatedUser, UserService } from "../user/user.service";
import { EventsRole } from "../generated/client";

@Injectable()
export class SessionsService {
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

  async create(dto: CreateSessionDto, user: AuthenticatedUser) {
    await this.assertCanManageEvent(dto.eventId, user);
    return this.prisma.session.create({
      data: {
        eventId: dto.eventId,
        title: dto.title,
        speakerName: dto.speakerName,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Session not found");
    await this.assertCanManageEvent(session.eventId, user);
    return this.prisma.session.delete({ where: { id } });
  }
}
