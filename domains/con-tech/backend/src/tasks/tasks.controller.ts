import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  UseFilters,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthenticatedUser } from '../user/user.service';
import { ConTechProfileGuard, RoleGuard, Roles } from '../auth';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskIdSchema,
  GetTasksByProjectSchema,
} from './tasks.validation';

@Controller()
@UseGuards(ConTechProfileGuard)
@UseFilters(RpcExceptionFilter)
export class TasksController {
  private readonly logger = new Logger(TasksController.name);
  constructor(private readonly tasksService: TasksService) {}

  @MessagePattern({ cmd: 'create_task' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR')
  @UsePipes(new JoiValidationPipe(CreateTaskSchema))
  async create(
    @Payload() payload: { dto: CreateTaskDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating task for project ID: ${payload.dto.projectId} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.tasksService.create(payload.dto, payload.user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create task for project ID ${payload.dto.projectId} by user ${payload.user.firebaseId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_all_tasks' })
  async findGlobal(
    @Payload()
    payload: {
      query: Record<string, any>;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Fetching global tasks (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.tasksService.findAll(payload.query, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch global tasks by user ${payload.user.firebaseId}: ${error.message}`,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_tasks_by_project' })
  @UsePipes(new JoiValidationPipe(GetTasksByProjectSchema))
  async findByProject(
    @Payload()
    payload: {
      projectId: number;
      query: Record<string, any>;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Fetching tasks for project ID: ${payload.projectId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.tasksService.findByProject(
        payload.projectId,
        payload.query,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch tasks for project ID ${payload.projectId}: ${error.message}`,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_task_by_id' })
  @UsePipes(new JoiValidationPipe(TaskIdSchema))
  async findOne(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching task details for ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.tasksService.findOne(payload.id, payload.user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch task details for ID ${payload.id} by user ${payload.user.firebaseId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_task' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR')
  @UsePipes(new JoiValidationPipe(UpdateTaskSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      dto: UpdateTaskDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating task ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.tasksService.update(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update task ID ${payload.id} by user ${payload.user.firebaseId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'remove_task' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(TaskIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing task ID: ${payload.id} by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.tasksService.remove(payload.id, payload.user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to remove task ID ${payload.id} by user ${payload.user.firebaseId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_task_progress' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR')
  async updateProgress(
    @Payload()
    payload: {
      id: number;
      progress: number;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating progress for task ID: ${payload.id} to ${payload.progress}% by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.tasksService.updateTaskProgress(
        payload.id,
        payload.progress,
        payload.user,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update progress for task ID ${payload.id} by user ${payload.user.firebaseId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_task_stats' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR', 'CLIENT')
  async getStats(
    @Payload()
    payload: {
      projectId?: number;
      assignedTo?: string;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Fetching task stats for project: ${payload.projectId || 'all'}, assignedTo: ${payload.assignedTo || 'all'} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.tasksService.getTaskStats(
        payload.user,
        payload.projectId,
        payload.assignedTo,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch task stats for user ${payload.user.firebaseId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'assign_task' })
  async assignTask(@Payload() payload: { id: number; userId: string; user: AuthenticatedUser }) {
    this.logger.log(`Assigning task ${payload.id} to user ${payload.userId}`);
    return this.tasksService.assignTask(payload.id, payload.userId, payload.user);
  }

  @MessagePattern({ cmd: 'update_task_status' })
  async updateStatus(@Payload() payload: { id: number; status: string; user: AuthenticatedUser }) {
    this.logger.log(`Updating task ${payload.id} status to ${payload.status}`);
    return this.tasksService.updateTaskStatus(payload.id, payload.status, payload.user);
  }
}
