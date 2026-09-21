import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  UseFilters,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { AuthenticatedUser } from '../user/user.service';
import { ConTechProfileGuard, RoleGuard, Roles } from '../auth';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateInspectionSchema,
  UpdateInspectionSchema,
  InspectionIdSchema,
  GetInspectionsByProjectSchema,
} from './inspections.validation';

@Controller()
@UseGuards(ConTechProfileGuard)
@UseFilters(RpcExceptionFilter)
export class InspectionsController {
  private readonly logger = new Logger(InspectionsController.name);
  constructor(private readonly inspectionsService: InspectionsService) {}

  @MessagePattern({ cmd: 'create_Inspection' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(CreateInspectionSchema))
  async create(
    @Payload()
    payload: {
      dto: CreateInspectionDto;
      files: any[];
      user: AuthenticatedUser;
    },
  ) {
    const { dto, files, user } = payload;
    this.logger.log(
      `Creating inspection for project ID: ${dto.projectId} by user: ${user.firebaseId}`,
    );
    try {
      return await this.inspectionsService.create(dto, files);
    } catch (error) {
      this.logger.error(
        `Failed to create inspection for project ID ${dto.projectId} by user ${user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_all_inspections' })
  async findGlobal(
    @Payload()
    data: {
      pagination?: { skip?: number; take?: number };
      user: AuthenticatedUser;
    },
  ) {
    const { pagination = {}, user } = data;
    this.logger.log(
      `Fetching global inspections (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.inspectionsService.findAll(pagination, user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch global inspections: ${error.message}`,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'findAllInspections' })
  @UsePipes(new JoiValidationPipe(GetInspectionsByProjectSchema))
  async findAll(
    @Payload()
    data: {
      projectId: number;
      pagination?: { skip?: number; take?: number };
      user: AuthenticatedUser;
    },
  ) {
    const { projectId, pagination = {}, user } = data;
    this.logger.log(
      `Fetching inspections for project ID: ${projectId} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.inspectionsService.findAllForProject(
        projectId,
        pagination,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch inspections for project ID ${projectId} by user ${user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern('findOneInspection')
  @UsePipes(new JoiValidationPipe(InspectionIdSchema))
  async findOne(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching inspection ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.inspectionsService.findOne(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch inspection ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern('updateInspection')
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateInspectionSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      updateInspectionDto: UpdateInspectionDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating inspection ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      const dto = { ...payload.updateInspectionDto, id: payload.id };
      return await this.inspectionsService.update(dto.id, dto, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to update inspection ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern('removeInspection')
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(InspectionIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing inspection ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.inspectionsService.remove(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to remove inspection ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern('finalizeInspection')
  async finalize(@Payload() payload: { id: number; status: string; user: AuthenticatedUser }) {
    this.logger.log(`Finalizing inspection ${payload.id} with status ${payload.status}`);
    return this.inspectionsService.finalize(payload.id, payload.status, payload.user);
  }
}
