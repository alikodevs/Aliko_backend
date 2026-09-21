import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CreateMilestoneReviewDto } from './dto/create-milestone-review.dto';
import { FindAllMilestonesDto } from './dto/find-all-milestones.dto';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { Prisma, Project } from '@prisma/client';

@Injectable()
export class MilestonesService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(
    createMilestoneDto: CreateMilestoneDto,
    user: AuthenticatedUser,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: createMilestoneDto.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const profile = await this.userService.getOrCreateProfile(user);
    if (
      profile.role !== 'ADMIN' &&
      project.contractorId !== user.firebaseId &&
      project.manager !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to create milestones for this project.',
      );
    }

    const milestone = await this.prisma.milestone.create({
      data: createMilestoneDto,
    });
    await this.updateProjectProgress(milestone.projectId);
    return milestone;
  }

  async findAll(dto: FindAllMilestonesDto, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
    const { projectId, status, search, page = 1, limit = 10 } = dto;

    const where: Prisma.MilestoneWhereInput = {};

    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) throw new NotFoundException('Project not found');

      if (profile.role === 'CLIENT' && project.clientId !== user.firebaseId) {
        throw new ForbiddenException(
          'You do not have permission to view milestones for this project.',
        );
      }
      if (
        profile.role === 'CONTRACTOR' &&
        project.contractorId !== user.firebaseId
      ) {
        throw new ForbiddenException(
          'You do not have permission to view milestones for this project.',
        );
      }
      where.projectId = projectId;
    } else if (profile.role !== 'ADMIN') {
      // If no projectId, non-admin users can only see milestones for projects they are involved in
      where.Project = {
        OR: [
          { manager: user.firebaseId },
          { contractorId: user.firebaseId },
          { clientId: user.firebaseId },
        ],
      };
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (profile.role === 'CLIENT') {
      where.isVisibleToClient = true;
    }

    const skip = (page - 1) * limit;

    const [milestones, total] = await Promise.all([
      this.prisma.milestone.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { Project: { select: { name: true } } },
      }),
      this.prisma.milestone.count({ where }),
    ]);

    return {
      data: milestones,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id },
      include: { Project: true },
    });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const project = (milestone as unknown as { Project: Project }).Project;
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role === 'CLIENT') {
      if (project.clientId !== user.firebaseId || !milestone.isVisibleToClient) {
        throw new ForbiddenException(
          'You do not have permission to view this milestone.',
        );
      }
    }
    if (
      profile.role === 'CONTRACTOR' &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this milestone.',
      );
    }

    return milestone;
  }

  async update(
    id: number,
    updateMilestoneDto: UpdateMilestoneDto,
    user: AuthenticatedUser,
  ) {
    const _milestone = await this.findOne(id, user); // RBAC Check

    // Only Admin/PM/Contractor can update milestone details (e.g. progress)
    // Client is Read-Only
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role === 'CLIENT') {
      throw new ForbiddenException('Clients cannot update milestones.');
    }

    const result = await this.prisma.milestone.update({
      where: { id },
      data: updateMilestoneDto,
    });
    await this.updateProjectProgress(result.projectId);
    return result;
  }

  async remove(id: number, user: AuthenticatedUser) {
    const _milestone = await this.findOne(id, user); // RBAC check

    const profile = await this.userService.getOrCreateProfile(user);
    // Only Admin/PM can remove. Controller already checks @Roles but double check here if needed.
    // If CONTRACTOR tries to remove via message, catch here.
    if (profile.role === 'CONTRACTOR' || profile.role === 'CLIENT') {
      throw new ForbiddenException(
        'You do not have permission to delete milestones.',
      );
    }

    const deletedMilestone = await this.prisma.milestone.delete({
      where: { id },
    });
    await this.updateProjectProgress(_milestone.projectId);
    return deletedMilestone;
  }

  async submitForReview(id: number, user: AuthenticatedUser) {
    const _milestone = await this.findOne(id, user); // RBAC

    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role === 'CLIENT') {
      throw new ForbiddenException(
        'Clients cannot submit milestones for review.',
      );
    }

    const result = await this.prisma.milestone.update({
      where: { id },
      data: { status: 'IN_REVIEW' },
    });
    await this.updateProjectProgress(result.projectId);
    return result;
  }

  async createReview(
    id: number,
    dto: CreateMilestoneReviewDto,
    user: AuthenticatedUser,
  ) {
    const _milestone = await this.findOne(id, user); // RBAC
    const profile = await this.userService.getOrCreateProfile(user);

    if (profile.role !== 'ADMIN') {
      throw new ForbiddenException('Only Admins can review milestones.');
    }

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id },
      data: {
        status: dto.status,
        // Any other notes?
      },
    });

    await this.updateProjectProgress(updatedMilestone.projectId);
    return updatedMilestone;
  }

  private async updateProjectProgress(projectId: number) {
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
    });

    if (milestones.length === 0) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { progress: 0 },
      });
      return;
    }

    const approvedCount = milestones.filter(
      (m) => m.status === 'APPROVED',
    ).length;
    const progress = (approvedCount / milestones.length) * 100;

    await this.prisma.project.update({
      where: { id: projectId },
      data: { progress },
    });
  }
}
