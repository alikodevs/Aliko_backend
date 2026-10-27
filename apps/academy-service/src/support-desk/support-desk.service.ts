import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  ListSupportTicketsDto,
} from './dto';
import { AcademyRole } from '@prisma/client/academy';

@Injectable()
export class SupportDeskService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateSupportTicketDto) {
    let finalDesc = dto.description;
    if (dto.clientDiagnostics) {
      finalDesc += `\n\n[Client Diagnostics]\n` +
        `Browser: ${dto.clientDiagnostics.browser || 'N/A'}\n` +
        `OS: ${dto.clientDiagnostics.os || 'N/A'}\n` +
        `Screen: ${dto.clientDiagnostics.screenResolution || 'N/A'}\n` +
        `Cookies Enabled: ${dto.clientDiagnostics.cookiesEnabled ?? 'N/A'}\n` +
        `WebRTC/Camera: ${dto.clientDiagnostics.webRtcSupported ?? 'N/A'}`;
    }

    return this.prisma.supportTicket.create({
      data: {
        userId,
        category: dto.category,
        subject: dto.subject,
        description: finalDesc,
        priority: dto.priority || 'MEDIUM',
        attachmentUrl: dto.attachmentUrl,
      },
      include: {
        profile: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });
  }

  async getMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicketById(ticketId: number, userId: string, role?: AcademyRole | string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        profile: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${ticketId} not found`);
    }

    const isStaffOrAuditor =
      role === AcademyRole.ADMIN ||
      role === AcademyRole.COURSE_MANAGER ||
      role === AcademyRole.COMMISSION_AUDITOR ||
      role === AcademyRole.INSTRUCTOR ||
      role === 'ADMIN' ||
      role === 'COURSE_MANAGER' ||
      role === 'COMMISSION_AUDITOR' ||
      role === 'INSTRUCTOR';

    if (ticket.userId !== userId && !isStaffOrAuditor) {
      throw new ForbiddenException('You do not have permission to view this support ticket');
    }

    return ticket;
  }

  async listAllTickets(dto: ListSupportTicketsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.category) where.category = dto.category;
    if (dto.status) where.status = dto.status;
    if (dto.priority) where.priority = dto.priority;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateTicketStatus(dto: UpdateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: dto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${dto.ticketId} not found`);
    }

    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.priority) updateData.priority = dto.priority;
    if (dto.resolution !== undefined) updateData.resolution = dto.resolution;

    return this.prisma.supportTicket.update({
      where: { id: dto.ticketId },
      data: updateData,
    });
  }

  getSystemRequirements() {
    return {
      supportedOperatingSystems: ['Windows 10/11', 'macOS 11+', 'ChromeOS 90+', 'Ubuntu 20.04+'],
      supportedBrowsers: [
        { name: 'Google Chrome', minVersion: '90.0', recommended: true },
        { name: 'Microsoft Edge', minVersion: '90.0', recommended: true },
        { name: 'Mozilla Firefox', minVersion: '88.0', recommended: false },
        { name: 'Apple Safari', minVersion: '14.0', recommended: false },
      ],
      hardwareRequirements: {
        minimumRamMb: 4096,
        recommendedRamMb: 8192,
        webcamRequiredForExams: true,
        microphoneRequiredForConferencing: true,
        minimumDisplayResolution: '1280x720',
      },
      networkRequirements: {
        minimumBandwidthMbps: 5.0,
        recommendedBandwidthMbps: 15.0,
        latencyMsThreshold: 150,
      },
      browserSettingsRequired: {
        cookiesEnabled: true,
        javaScriptEnabled: true,
        localStorageEnabled: true,
        webRtcCameraAccessEnabled: true,
      },
      helpdeskSla: {
        urgentPriorityHours: 2,
        highPriorityHours: 6,
        mediumPriorityHours: 24,
        lowPriorityHours: 48,
        supportHoursDescription: 'Monday - Friday: 7:00 AM - 9:00 PM PST; Saturday: 8:00 AM - 5:00 PM PST',
      },
    };
  }
}
