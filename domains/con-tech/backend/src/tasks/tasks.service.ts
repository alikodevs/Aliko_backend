import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  TaskStatus as _TaskStatus,
  TaskPriority as _TaskPriority,
  Prisma,
  Project,
} from '@prisma/client';
import { AuthenticatedUser, UserService } from '../user/user.service';

type FindTasksQuery = {
  projectId?: number;
  status?: string;
  assignedTo?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(dto: CreateTaskDto, user: AuthenticatedUser) {
    const contechProfile = await this.userService.getOrCreateProfile(user);

    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (
      contechProfile.role !== 'ADMIN' &&
      project.contractorId !== user.firebaseId &&
      project.manager !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to create tasks for this project',
      );
    }

    if (dto.assignedTo) {
      // Ensure user has a profile and is synced from Auth
      await this.userService.ensureProfileExists(dto.assignedTo);
      const assignee = await this.userService.getUserById(dto.assignedTo);
      if (!assignee)
        throw new BadRequestException('Assigned user does not exist');
    }

    return await this.prisma.task.create({
      data: {
        projectId: dto.projectId,
        description: dto.description ?? '',
        status: 'PENDING',
        deadline: dto.deadline ? new Date(dto.deadline) : new Date(),
        assignedTo: (dto.assignedTo as any) ?? null,
        isVisibleToClient: dto.isVisibleToClient ?? false,
      },
    });
  }

  async findAll(query: FindTasksQuery, user: AuthenticatedUser) {
    const contechProfile = await this.userService.getOrCreateProfile(user);
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 50);
    const skip = (page - 1) * pageSize;

    const where: Prisma.TaskWhereInput = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.status) where.status = query.status;
    if (query.assignedTo) where.assignedTo = query.assignedTo;

    // RBAC
    if (contechProfile.role === 'CLIENT') {
      where.isVisibleToClient = true;
      where.Project = { clientId: user.firebaseId };
    } else if (contechProfile.role === 'CONTRACTOR') {
      // Show tasks of projects I am the contractor for OR tasks assigned to me directly
      where.OR = [
        { Project: { contractorId: user.firebaseId } },
        { assignedTo: user.firebaseId },
      ];
    } else if (contechProfile.role === 'PROJECT_MANAGER') {
      where.Project = { manager: user.firebaseId };
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ deadline: 'asc' }],
        include: { Project: true },
      }),
      this.prisma.task.count({ where }),
    ]);

    const assigneeIds = tasks
      .map((t) => t.assignedTo)
      .filter((id) => id !== null);
    const assignees =
      assigneeIds.length > 0
        ? await this.userService.getUsersByIds(assigneeIds)
        : [];

    const enrichedTasks = tasks.map((task) => ({
      ...task,
      project: task.Project,
      assignee: task.assignedTo
        ? assignees.find((a) => a.firebaseId === task.assignedTo) || null
        : null,
    }));

    return {
      items: enrichedTasks,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByProject(
    projectId: number,
    query: FindTasksQuery,
    user: AuthenticatedUser,
  ) {
    return this.findAll({ ...query, projectId }, user);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { Project: true }, // Include full project to check clientId/contractorId
    });
    if (!task) throw new NotFoundException('Task not found');

    const contechProfile = await this.userService.getOrCreateProfile(user);
    const project = task.Project;

    // RBAC Check
    if (contechProfile.role === 'CLIENT') {
      if (project.clientId !== user.firebaseId || !task.isVisibleToClient) {
        throw new ForbiddenException(
          'You do not have permission to view this task',
        );
      }
    }
    if (
      contechProfile.role === 'CONTRACTOR' &&
      project.contractorId !== user.firebaseId &&
      task.assignedTo !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this task',
      );
    }

    if (!task) throw new NotFoundException('Task not found');

    const assignee = task.assignedTo
      ? await this.userService.getUserById(task.assignedTo)
      : null;

    return {
      ...task,
      assignee,
    };
  }

  async update(id: number, dto: UpdateTaskDto, user: AuthenticatedUser) {
    const contechProfile = await this.userService.getOrCreateProfile(user);
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { Project: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const project = task.Project;
    const canUpdate =
      contechProfile.role === 'ADMIN' ||
      project.manager === user.firebaseId ||
      project.contractorId === user.firebaseId ||
      task.assignedTo === user.firebaseId;
    if (!canUpdate)
      throw new ForbiddenException(
        'You do not have permission to update this task',
      );

    if (dto.assignedTo && dto.assignedTo !== task.assignedTo) {
      await this.userService.ensureProfileExists(dto.assignedTo);
      const assignee = await this.userService.getUserById(dto.assignedTo);
      if (!assignee)
        throw new BadRequestException('Assigned user does not exist');
    }

    // Build update data, filtering out undefined fields
    const rawData: any = {
      description: dto.description,
      status: dto.status,
      assignedTo: dto.assignedTo,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      progress: dto.progress,
      actualHours: dto.actualHours,
      isVisibleToClient: dto.isVisibleToClient,
    };
    const updateData: any = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (value !== undefined) updateData[key] = value;
    }

    return await this.prisma.task.update({ where: { id }, data: updateData });
  }

  async remove(id: number, user: AuthenticatedUser) {
    const contechProfile = await this.userService.getOrCreateProfile(user);
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { Project: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const project = (task as unknown as { Project: Project }).Project;
    if (
      contechProfile.role !== 'ADMIN' &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this task',
      );
    }

    return await this.prisma.task.delete({ where: { id } });
  }

  async updateTaskProgress(
    id: number,
    progress: number,
    user: AuthenticatedUser,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { Project: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const project = (task as unknown as { Project: Project }).Project;
    if (
      task.assignedTo !== user.firebaseId &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this task progress',
      );
    }

    let status = task.status;
    if (progress === 0 && status === 'IN_PROGRESS') status = 'PENDING';
    else if (progress > 0 && progress < 100 && status === 'PENDING')
      status = 'IN_PROGRESS';
    else if (progress === 100) status = 'COMPLETED';

    return await this.prisma.task.update({
      where: { id },
      data: { status },
    });
  }

  async getTaskStats(
    user: AuthenticatedUser,
    projectId?: number,
    assignedTo?: string,
  ) {
    const contechProfile = await this.userService.getOrCreateProfile(user);
    const where: Prisma.TaskWhereInput = {};
    if (projectId) where.projectId = projectId;
    if (assignedTo) where.assignedTo = assignedTo;

    // Role filtering
    if (contechProfile.role === 'CLIENT') {
      where.isVisibleToClient = true;
      // Also ensure project belongs to client if projectId provided
      if (projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: projectId },
        });
        if (project?.clientId !== user.firebaseId) {
          throw new ForbiddenException('Unauthorized');
        }
      }
    } else if (contechProfile.role === 'CONTRACTOR' && !assignedTo) {
      // If contractor wants general stats, maybe filter by their projects?
      // For now, let's keep it simple or filter by assignedTo=user.firebaseId if no assignedTo provided.
      // But contractor might want to see ALL tasks for their project.
    }

    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      blockedTasks,
    ] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.task.count({ where: { ...where, status: 'BLOCKED' } }),
    ]);

    return {
      total: totalTasks,
      pending: pendingTasks,
      inProgress: inProgressTasks,
      completed: completedTasks,
      blocked: blockedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    };
  }

  async assignTask(id: number, userId: string, user: AuthenticatedUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { Project: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const contechProfile = await this.userService.getOrCreateProfile(user);
    const project = task.Project;

    // Only Admin or PM can assign tasks
    if (contechProfile.role !== 'ADMIN' && project.manager !== user.firebaseId) {
      throw new ForbiddenException('Only Admins or Project Managers can assign tasks');
    }

    await this.userService.ensureProfileExists(userId);
    const assignee = await this.userService.getUserById(userId);
    if (!assignee) throw new BadRequestException('Assigned user does not exist');

    return this.prisma.task.update({
      where: { id },
      data: { assignedTo: userId },
    });
  }

  async updateTaskStatus(id: number, status: string, user: AuthenticatedUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { Project: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const contechProfile = await this.userService.getOrCreateProfile(user);
    const project = task.Project;

    // Admin, PM, Contractor for the project, or the Assignee can update status
    const isAssignee = task.assignedTo === user.firebaseId;
    const isContractor = project.contractorId === user.firebaseId;
    const isPM = project.manager === user.firebaseId;
    const isAdmin = contechProfile.role === 'ADMIN';

    if (!isAdmin && !isPM && !isContractor && !isAssignee) {
      throw new ForbiddenException('You do not have permission to update this task status');
    }

    return this.prisma.task.update({
      where: { id },
      data: { status },
    });
  }
}
