// src/client-reports/client-reports.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust the path to your Prisma service
import { CreateClientReportDto } from './dto/create-client-report.dto';
import { Prisma, Project } from '@prisma/client';
import { AuthenticatedUser, UserService } from '../user/user.service';

@Injectable()
export class ClientReportService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(
    createClientReportDto: CreateClientReportDto,
    _user: AuthenticatedUser,
  ) {
    const { projectId, summary, KPIs, title: _title } = createClientReportDto;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    return this.prisma.clientReport.create({
      data: {
        projectId,
        summary,
        KPIs: KPIs as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async findAllByProjectId(projectId: number, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role === 'CLIENT' && project.clientId !== user.firebaseId) {
      throw new ForbiddenException(
        'You do not have permission to view reports for this project.',
      );
    }
    if (
      profile.role === 'CONTRACTOR' &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view reports for this project.',
      );
    }

    return this.prisma.clientReport.findMany({
      where: {
        projectId: projectId,
      },
      orderBy: {
        generatedAt: 'desc', // Show the most recent reports first
      },
    });
  }

  async findOneById(reportId: number, user: AuthenticatedUser) {
    const report = await this.prisma.clientReport.findUnique({
      where: {
        id: reportId,
      },
      include: { Project: true },
    });

    if (!report) {
      throw new NotFoundException(
        `Client Report with ID ${reportId} not found.`,
      );
    }

    const project = (report as unknown as { Project: Project }).Project;
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role === 'CLIENT' && project.clientId !== user.firebaseId) {
      throw new ForbiddenException(
        'You do not have permission to view this report.',
      );
    }
    if (
      profile.role === 'CONTRACTOR' &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this report.',
      );
    }

    return report;
  }
}
