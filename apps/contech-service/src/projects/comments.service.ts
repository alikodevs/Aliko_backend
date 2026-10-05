import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(projectId: number, content: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const profile = await this.userService.getOrCreateProfile(user);

    // RBAC Check: Admin, Contractor of project, or Client of project can comment
    const isAdmin = profile.role === 'ADMIN';
    const isContractor = project.contractorId === user.firebaseId;
    const isClient = project.clientId === user.firebaseId;

    if (!isAdmin && !isContractor && !isClient) {
      throw new ForbiddenException(
        'You do not have permission to comment on this project',
      );
    }

    return await this.prisma.comment.create({
      data: {
        projectId,
        content,
        createdBy: user.firebaseId,
      },
    });
  }

  async findByProject(projectId: number, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const profile = await this.userService.getOrCreateProfile(user);

    // Access check same as 프로젝트 view
    if (profile.role === 'CLIENT' && project.clientId !== user.firebaseId) {
      throw new ForbiddenException(
        'You do not have permission to view comments for this project',
      );
    }
    if (
      profile.role === 'CONTRACTOR' &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view comments for this project',
      );
    }

    const comments = await this.prisma.comment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    // Enrich with creator info
    const creatorIds = [
      ...new Set(comments.map((c) => c.createdBy).filter((id) => id !== null)),
    ] as string[];
    const creators =
      creatorIds.length > 0
        ? await this.userService.getUsersByIds(creatorIds)
        : [];

    return comments.map((comment) => ({
      ...comment,
      creator: creators.find((c) => c.firebaseId === comment.createdBy) || null,
    }));
  }
}
