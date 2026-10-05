import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { PushNotificationService } from '@alikohub/notification';
import { AcademyRole } from '../generated/client';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);
  private readonly notificationService = new PushNotificationService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async create(dto: CreateAnnouncementDto, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role !== AcademyRole.ADMIN && profile.role !== AcademyRole.INSTRUCTOR) {
      throw new ForbiddenException('Only admins and instructors can create announcements');
    }

    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
      },
    });

    // Send push notification to all users subscribed to the 'announcements' topic
    this.notificationService.sendAnnouncementNotification(
      announcement.title,
      announcement.content.substring(0, 100),
      String(announcement.id),
    ).catch((err) => this.logger.error('Failed to send announcement push notification:', err));

    return announcement;
  }

  async findAll(query: any = {}) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.announcement.count(),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: Number(id) },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return announcement;
  }

  async update(id: number, dto: UpdateAnnouncementDto, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role !== AcademyRole.ADMIN && profile.role !== AcademyRole.INSTRUCTOR) {
      throw new ForbiddenException('Only admins and instructors can update announcements');
    }

    const announcement = await this.prisma.announcement.findUnique({
      where: { id: Number(id) },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return await this.prisma.announcement.update({
      where: { id: Number(id) },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
    });
  }

  async remove(id: number, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role !== AcademyRole.ADMIN && profile.role !== AcademyRole.INSTRUCTOR) {
      throw new ForbiddenException('Only admins and instructors can delete announcements');
    }

    const announcement = await this.prisma.announcement.findUnique({
      where: { id: Number(id) },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return await this.prisma.announcement.delete({
      where: { id: Number(id) },
    });
  }
}

