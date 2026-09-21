import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { winstonLogger } from '../logger';

type FindAllQuery = {
  page?: number;
  pageSize?: number;
  status?: string;
  manager?: string;
  search?: string;
};

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(dto: CreateProjectDto, user: AuthenticatedUser) {
    winstonLogger.info(
      `Creating project: ${dto.name} for user: ${user.firebaseId}`,
    );
    try {
      const contechProfile = await this.userService.getOrCreateProfile(user);
      winstonLogger.info(`User profile role: ${contechProfile.role}`);

      // Only ADMIN can create projects
      if (contechProfile.role !== 'ADMIN') {
        winstonLogger.warn(
          `User ${user.firebaseId} with role ${contechProfile.role} tried to create a project`,
        );
        throw new RpcException('Only Admins can create projects.');
      }

      // Ensure client exists if provided
      if (dto.clientId)
        await this.userService.ensureProfileExists(dto.clientId);
      if (dto.contractorId)
        await this.userService.ensureProfileExists(dto.contractorId);

      // Check if project with same name exists for this manager
      const { budget, location, ...restDto } = dto;
      const metadata = budget ? { budget } : Prisma.JsonNull;

      const result = await this.prisma.project.create({
        data: {
          ...restDto,
          site: location || restDto.site,
          metadata: budget ? { budget } : undefined,
          manager: user.firebaseId,
          contractorId: dto.contractorId,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          status: 'ACTIVE',
          createdBy: user.firebaseId,
          updatedBy: user.firebaseId,
        },
      });
      winstonLogger.info(`Project created successfully: ${result.id}`);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      winstonLogger.error(
        `Failed to create project: ${errorMessage} - ${errorStack}`,
      );
      throw error;
    }
  }

  async getContracrors() {
    return this.prisma.contechProfile.findMany({
      where: { role: 'CONTRACTOR' },
      select: { userId: true },
    });
  }

  async getInspectors() {
    return this.prisma.contechProfile.findMany({
      where: { role: 'ADMIN' },
      select: { userId: true },
    });
  }

  async findAll(query: FindAllQuery, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
    winstonLogger.info(
      `FindAll Projects for user ${user.firebaseId} with role ${profile.role}`,
    );

    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 10, 50);
    const skip = (page - 1) * pageSize;

    const where: Record<string, any> = {};

    // RBAC Filtering
    if (profile.role === 'CONTRACTOR') {
      where.contractorId = user.firebaseId;
    } else if (profile.role === 'CLIENT') {
      where.clientId = user.firebaseId;
    }
    // ADMIN see all (or use query filters)

    if (query.status) where.status = query.status;
    if (query.manager) where.manager = query.manager;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          tasks: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    // Enrich with manager, client, and contractor data
    const userIds = [
      ...new Set([
        ...projects.map((p) => p.manager),
        ...projects.map((p) => p.clientId).filter((id) => id != null),
        ...projects.map((p) => p.contractorId).filter((id) => id != null),
      ]),
    ] as string[];

    const users = await this.userService.getUsersByIds(userIds);

    const enrichedProjects = projects.map((project) => ({
      ...project,
      manager: users.find((u) => u.firebaseId === project.manager) || null,
      client: project.clientId
        ? users.find((u) => u.firebaseId === project.clientId) || null
        : null,
      contractor: project.contractorId
        ? users.find((u) => u.firebaseId === project.contractorId) || null
        : null,
      taskStats: {
        total: project.tasks.length,
        completed: project.tasks.filter((t) => t.status === 'COMPLETED').length,
        inProgress: project.tasks.filter((t) => t.status === 'IN_PROGRESS')
          .length,
        pending: project.tasks.filter((t) => t.status === 'PENDING').length,
      },
    }));

    return {
      items: enrichedProjects,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        tasks: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // RBAC Check
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role === 'CLIENT' && project.clientId !== user.firebaseId) {
      throw new ForbiddenException(
        'You do not have permission to view this project.',
      );
    }
    if (
      profile.role === 'CONTRACTOR' &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this project.',
      );
    }

    // Enrich with manager, client and contractor data
    const [manager, client, contractor] = await Promise.all([
      this.userService.getUserById(project.manager),
      project.clientId
        ? this.userService.getUserById(project.clientId)
        : Promise.resolve(null),
      project.contractorId
        ? this.userService.getUserById(project.contractorId)
        : Promise.resolve(null),
    ]);

    return {
      ...project,
      manager,
      client,
      contractor,
    };
  }

  async update(id: number, dto: UpdateProjectDto, user: AuthenticatedUser) {
    const contechProfile = await this.userService.getOrCreateProfile(user);
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permissions: ADMIN can update any project
    if (contechProfile.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to update this project',
      );
    }

    // Ensure newly assigned users have profiles and are synced
    if (dto.manager) await this.userService.ensureProfileExists(dto.manager);
    if (dto.inspectorId)
      await this.userService.ensureProfileExists(dto.inspectorId);
    if (dto.contractorId)
      await this.userService.ensureProfileExists(dto.contractorId);

    const { budget, location, ...restDto } = dto;

    return await this.prisma.project.update({
      where: { id },
      data: {
        ...restDto,
        ...(location !== undefined && { site: location }),
        ...(budget !== undefined && { metadata: { budget } }),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        updatedBy: user.firebaseId,
      },
    });
  }

  async remove(id: number, user: AuthenticatedUser) {
    const contechProfile = await this.userService.getOrCreateProfile(user);
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permissions
    if (contechProfile.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to delete this project',
      );
    }

    return await this.prisma.project.delete({ where: { id } });
  }

  async updateStatus(
    id: number,
    status: ProjectStatus,
    user: AuthenticatedUser,
  ) {
    const contechProfile = await this.userService.getOrCreateProfile(user);
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permissions
    const isManager = project.manager === user.firebaseId;
    const isContractor = project.contractorId === user.firebaseId;

    if (
      contechProfile.role !== 'ADMIN' &&
      !isManager &&
      !(contechProfile.role === 'CONTRACTOR' && isContractor)
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this project status',
      );
    }

    return await this.prisma.project.update({
      where: { id },
      data: {
        status: status as string,
        updatedBy: user.firebaseId,
      },
    });
  }

  async updatePhotos(id: number, photos: string[], user: AuthenticatedUser) {
    const contechProfile = await this.userService.getOrCreateProfile(user);
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permissions
    const isManager = project.manager === user.firebaseId;
    const isContractor = project.contractorId === user.firebaseId;

    if (
      contechProfile.role !== 'ADMIN' &&
      !isManager &&
      !(contechProfile.role === 'CONTRACTOR' && isContractor)
    ) {
      throw new ForbiddenException(
        'You do not have permission to update photos for this project',
      );
    }

    return await this.prisma.project.update({
      where: { id },
      data: { photos, updatedBy: user.firebaseId },
    });
  }

  async getProjectStats(user: AuthenticatedUser, manager?: string) {
    const profile = await this.userService.getOrCreateProfile(user);
    const where: Record<string, any> = manager ? { manager } : {};

    // Filter by role if not Admin
    if (profile.role === 'CONTRACTOR') {
      where.contractorId = user.firebaseId;
    } else if (profile.role === 'CLIENT') {
      where.clientId = user.firebaseId;
    }

    const totalProjects = await this.prisma.project.count({ where });
    const activeProjects = await this.prisma.project.count({
      where: { ...where, status: 'ACTIVE' },
    });
    const completedProjects = await this.prisma.project.count({
      where: { ...where, status: 'COMPLETED' },
    });
    const plannedProjects = await this.prisma.project.count({
      where: { ...where, status: 'PLANNED' },
    });

    // Sub-stats
    const [overdueTasksCount, upcomingInspectionsCount, pendingContractsValue] =
      await Promise.all([
        this.prisma.task.count({
          where: {
            status: { not: 'COMPLETED' },
            deadline: { lt: new Date() },
            Project: where,
          },
        }),
        this.prisma.inspection.count({
          where: {
            status: { in: ['PENDING', 'SCHEDULED'] },
            Project: where,
          },
        }),
        this.prisma.contract.findMany({
          where: {
            status: { in: ['DRAFT', 'PENDING_APPROVAL'] },
            Project: where,
          },
          select: {
            value: true,
          },
        }),
      ]);

    const totalPendingValue = pendingContractsValue.reduce(
      (acc, curr) => acc + (curr.value || 0),
      0,
    );

    return {
      total: totalProjects,
      active: activeProjects,
      completed: completedProjects,
      planned: plannedProjects,
      overdueTasks: overdueTasksCount,
      upcomingInspections: upcomingInspectionsCount,
      pendingContractsValue: totalPendingValue,
    };
  }

  // TEST-03: Project Progress API for contractors
  async updateProgress(
    projectId: number,
    progress: number,
    user: AuthenticatedUser,
    notes?: string,
  ) {
    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const contechProfile = await this.userService.getOrCreateProfile(user);

    const isAssignedContractor =
      contechProfile.role === 'CONTRACTOR' &&
      project.contractorId === user.firebaseId;
    const isProjectManager =
      contechProfile.role === 'PROJECT_MANAGER' &&
      project.manager === user.firebaseId;
    const isOwner = project.manager === user.firebaseId; // Current creator
    const isAdmin = contechProfile.role === 'ADMIN';

    if (!isAssignedContractor && !isProjectManager && !isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to update progress for this project',
      );
    }

    winstonLogger.info(
      `Updating progress for project ${projectId} to ${progress}% by user ${user.firebaseId}`,
    );

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        progress,
        updatedBy: user.firebaseId,
        updatedAt: new Date(),
      },
    });

    // Optionally create a project update log if notes are provided
    if (notes) {
      await this.prisma.projectUpdate.create({
        data: {
          projectId,
          authorId: user.firebaseId,
          text: `Progress updated to ${progress}%: ${notes}`,
        },
      });
    }

    return updatedProject;
  }

  // TEST-04: Weekly/Textual Updates - Create
  async createProjectUpdate(
    projectId: number,
    text: string,
    user: AuthenticatedUser,
    isVisibleToClient: boolean = false,
    photos: string[] = [],
    tags: string[] = [],
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const contechProfile = await this.userService.getOrCreateProfile(user);

    const isAssignedContractor =
      contechProfile.role === 'CONTRACTOR' &&
      project.contractorId === user.firebaseId;
    const isAdmin = contechProfile.role === 'ADMIN';

    if (!isAssignedContractor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to add updates to this project',
      );
    }

    winstonLogger.info(
      `Creating project update for project ${projectId} by user ${user.firebaseId}`,
    );

    return await this.prisma.projectUpdate.create({
      data: {
        projectId,
        authorId: user.firebaseId,
        text,
        isVisibleToClient,
        photos,
        tags,
      },
    });
  }

  // TEST-04: Weekly/Textual Updates - List
  async getProjectUpdates(
    projectId: number,
    user: AuthenticatedUser,
    page = 1,
    pageSize = 10,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const contechProfile = await this.userService.getOrCreateProfile(user);
    const isClient = contechProfile.role === 'CLIENT';

    // Check if user can view updates (same access as viewing project)
    if (isClient && project.clientId !== user.firebaseId) {
      throw new ForbiddenException(
        'You do not have permission to view updates for this project',
      );
    }
    if (
      contechProfile.role === 'CONTRACTOR' &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view updates for this project',
      );
    }

    const skip = (page - 1) * pageSize;

    const where: Prisma.ProjectUpdateWhereInput = { projectId };
    // Clients only see what is visible to them
    if (isClient) {
      where.isVisibleToClient = { equals: true };
    }

    const [updates, total] = await Promise.all([
      this.prisma.projectUpdate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.projectUpdate.count({ where }),
    ]);

    // Enrich with author data
    const authorIds: string[] = [...new Set(updates.map((u) => u.authorId))];
    const authors = await this.userService.getUsersByIds(authorIds);

    const enrichedUpdates = updates.map((update) => ({
      ...update,
      author: authors.find((a) => a.firebaseId === update.authorId) || null,
    }));

    return {
      items: enrichedUpdates,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Document Management
  async addDocument(
    projectId: number,
    dto: {
      title: string;
      url: string;
      fileType?: string;
      isVisibleToClient?: boolean;
    },
    user: AuthenticatedUser,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const contechProfile = await this.userService.getOrCreateProfile(user);

    const isAssignedContractor =
      contechProfile.role === 'CONTRACTOR' &&
      project.contractorId === user.firebaseId;
    const isAdmin = contechProfile.role === 'ADMIN';

    if (!isAssignedContractor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to add documents to this project',
      );
    }

    winstonLogger.info(
      `Adding document to project ${projectId} by user ${user.firebaseId}`,
    );

    return await this.prisma.projectDocument.create({
      data: {
        projectId,
        title: dto.title,
        url: dto.url,
        fileType: dto.fileType,
        isVisibleToClient: dto.isVisibleToClient ?? false,
        uploadedBy: user.firebaseId,
      },
    });
  }

  async getDocuments(
    projectId: number,
    user: AuthenticatedUser,
    page = 1,
    pageSize = 20,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const contechProfile = await this.userService.getOrCreateProfile(user);
    const isClient = contechProfile.role === 'CLIENT';

    // Access check
    if (isClient && project.clientId !== user.firebaseId) {
      throw new ForbiddenException(
        'You do not have permission to view documents for this project',
      );
    }
    if (
      contechProfile.role === 'CONTRACTOR' &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view documents for this project',
      );
    }

    const skip = (page - 1) * pageSize;

    const where: Prisma.ProjectDocumentWhereInput = { projectId };
    // Clients only see what is visible to them
    if (isClient) {
      where.isVisibleToClient = { equals: true };
    }

    const [documents, total] = await Promise.all([
      this.prisma.projectDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.projectDocument.count({ where }),
    ]);

    // Enrich with uploader info
    const uploaderIds: string[] = [
      ...new Set(documents.map((d) => d.uploadedBy)),
    ];
    const uploaders = await this.userService.getUsersByIds(uploaderIds);

    const enrichedDocuments = documents.map((doc) => ({
      ...doc,
      uploader: uploaders.find((u) => u.firebaseId === doc.uploadedBy) || null,
    }));

    return {
      items: enrichedDocuments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
