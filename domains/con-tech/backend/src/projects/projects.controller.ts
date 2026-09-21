import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  UseFilters,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from '@prisma/client';
import { CommentsService } from './comments.service';
import { AuthenticatedUser } from '../user/user.service';
import { ConTechProfileGuard, RoleGuard, Roles } from '../auth';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectIdSchema,
  FindAllProjectsSchema,
  UpdateProjectStatusSchema,
  UpdateProjectProgressSchema,
  CreateProjectUpdateSchema,
  GetProjectUpdatesSchema,
  AddProjectDocumentSchema,
  AddProjectCommentSchema,
} from './projects.validation';

@Controller()
@UseGuards(ConTechProfileGuard)
@UseFilters(RpcExceptionFilter)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly commentsService: CommentsService,
  ) {}

  @MessagePattern({ cmd: 'create_project' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(CreateProjectSchema))
  async create(
    @Payload() payload: { dto: CreateProjectDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating project "${payload.dto.name}" by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.projectsService.create(payload.dto, payload.user);
    } catch (error: any) {
      this.logger.error(
        `Failed to create project "${payload.dto.name}" for user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_all_projects' })
  @UsePipes(new JoiValidationPipe(FindAllProjectsSchema))
  async findAll(@Payload() payload: { query: any; user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching all projects with query: ${JSON.stringify(payload.query)} for user: ${payload.user?.firebaseId}`,
    );
    try {
      return await this.projectsService.findAll(payload.query, payload.user);
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch projects with query ${JSON.stringify(payload.query)} for user ${payload.user?.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_project_by_id' })
  @UsePipes(new JoiValidationPipe(ProjectIdSchema))
  async findOne(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching details for project ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.projectsService.findOne(payload.id, payload.user);
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch project details for ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_contractor' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  async findallcontractor() {
    this.logger.log(`Fetching all contractors list (admin operation)`);
    try {
      return await this.projectsService.getContracrors();
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch contractors: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_inspector' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  async findallinspector() {
    this.logger.log(`Fetching all inspectors list (admin operation)`);
    try {
      return await this.projectsService.getInspectors();
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch inspectors: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_project' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateProjectSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      dto: UpdateProjectDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating project ID: ${payload.id} by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.projectsService.update(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to update project ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'remove_project' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(ProjectIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing project ID: ${payload.id} by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.projectsService.remove(payload.id, payload.user);
    } catch (error: any) {
      this.logger.error(
        `Failed to remove project ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_project_status' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR')
  @UsePipes(new JoiValidationPipe(UpdateProjectStatusSchema))
  async updateStatus(
    @Payload()
    payload: {
      id: number;
      status: ProjectStatus;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating status for project ID: ${payload.id} to ${payload.status} by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.projectsService.updateStatus(
        payload.id,
        payload.status,
        payload.user,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to update status for project ID ${payload.id} to ${payload.status} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_project_photos' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR')
  async updatePhotos(
    @Payload()
    payload: {
      id: number;
      photos: string[];
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating photos for project ID: ${payload.id} by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.projectsService.updatePhotos(
        payload.id,
        payload.photos,
        payload.user,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to update photos for project ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_project_stats' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR', 'CLIENT')
  async getStats(
    @Payload() payload: { manager?: string; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Fetching project stats for manager: ${payload.manager || 'all'} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.projectsService.getProjectStats(
        payload.user,
        payload.manager,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch project stats for user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_project_progress' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR')
  @UsePipes(new JoiValidationPipe(UpdateProjectProgressSchema))
  async updateProgress(
    @Payload()
    payload: {
      id: number;
      progress: number;
      notes?: string;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating progress for project ID: ${payload.id} to ${payload.progress}% by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.projectsService.updateProgress(
        payload.id,
        payload.progress,
        payload.user,
        payload.notes,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to update progress for project ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'create_project_update' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR')
  @UsePipes(new JoiValidationPipe(CreateProjectUpdateSchema))
  async createUpdate(
    @Payload()
    payload: {
      projectId: number;
      text: string;
      isVisibleToClient?: boolean;
      photos?: string[];
      tags?: string[];
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Creating update for project ID: ${payload.projectId} by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.projectsService.createProjectUpdate(
        payload.projectId,
        payload.text,
        payload.user,
        payload.isVisibleToClient,
        payload.photos,
        payload.tags,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to create update for project ID ${payload.projectId} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_project_updates' })
  @UsePipes(new JoiValidationPipe(GetProjectUpdatesSchema))
  async getProjectUpdates(
    @Payload()
    payload: {
      projectId: number;
      page?: number;
      pageSize?: number;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Fetching updates for project ID: ${payload.projectId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.projectsService.getProjectUpdates(
        payload.projectId,
        payload.user,
        payload.page,
        payload.pageSize,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch updates for project ID ${payload.projectId} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'add_project_document' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR')
  @UsePipes(new JoiValidationPipe(AddProjectDocumentSchema))
  async addDocument(
    @Payload()
    payload: {
      projectId: number;
      dto: {
        title: string;
        url: string;
        fileType?: string;
        isVisibleToClient?: boolean;
      };
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Adding document "${payload.dto.title}" to project ID: ${payload.projectId} by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.projectsService.addDocument(
        payload.projectId,
        payload.dto,
        payload.user,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to add document to project ID ${payload.projectId} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_project_documents' })
  @UsePipes(new JoiValidationPipe(GetProjectUpdatesSchema))
  async getDocuments(
    @Payload()
    payload: {
      projectId: number;
      page?: number;
      pageSize?: number;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Fetching documents for project ID: ${payload.projectId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.projectsService.getDocuments(
        payload.projectId,
        payload.user,
        payload.page,
        payload.pageSize,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch documents for project ID ${payload.projectId} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'add_project_comment' })
  @UsePipes(new JoiValidationPipe(AddProjectCommentSchema))
  async addComment(
    @Payload()
    payload: {
      projectId: number;
      content: string;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Adding comment to project ID: ${payload.projectId} by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.commentsService.create(
        payload.projectId,
        payload.content,
        payload.user,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to add comment to project ID ${payload.projectId} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_project_comments' })
  @UsePipes(new JoiValidationPipe(ProjectIdSchema))
  async getComments(
    @Payload()
    payload: {
      id: number;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Fetching comments for project ID: ${payload.id} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.commentsService.findByProject(
        payload.id,
        payload.user,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch comments for project ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
