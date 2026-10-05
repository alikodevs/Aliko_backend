import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreatePortfolioDto } from "./dto/create-portfolio.dto";
import { AuthenticatedUser, UserService } from "../user/user.service";
import { EventsRole } from "../generated/client";

@Injectable()
export class PortfolioService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(createPortfolioDto: CreatePortfolioDto, user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);
    const isInternal = profile?.role === EventsRole.ADMIN || profile?.role === EventsRole.CONTENT_MANAGER;
    if (!profile || !isInternal) {
      throw new ForbiddenException("Only admins and content managers can manage portfolio media.");
    }

    return this.prisma.portfolioMedia.create({
      data: {
        ...createPortfolioDto,
        createdBy: user.firebaseId,
      },
    });
  }

  async findAll(portal?: string) {
    const where: any = {};
    if (portal) where.portal = portal;

    return this.prisma.portfolioMedia.findMany({
      where,
      orderBy: [
        { category: "asc" },
        { sortOrder: "asc" }
      ],
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);
    const isInternal = profile?.role === EventsRole.ADMIN || profile?.role === EventsRole.CONTENT_MANAGER;
    if (!profile || !isInternal) {
      throw new ForbiddenException("Only admins and content managers can manage portfolio media.");
    }

    const item = await this.prisma.portfolioMedia.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Media not found");

    return this.prisma.portfolioMedia.delete({ where: { id } });
  }
}
