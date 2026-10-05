import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  UseFilters,
} from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CreateMilestoneReviewDto } from './dto/create-milestone-review.dto';
import { FindAllMilestonesDto } from './dto/find-all-milestones.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthenticatedUser } from '../user/user.service';
import { ConTechProfileGuard, RoleGuard, Roles } from '../auth';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  CreateMilestoneReviewSchema,
  MilestoneIdSchema,
  FindMilestonesSchema,
} from './milestones.validation';

@Controller()
@UseGuards(ConTechProfileGuard)
@UseFilters(RpcExceptionFilter)
export class MilestonesController {
  private readonly logger = new Logger(MilestonesController.name);
  constructor(private readonly milestonesService: MilestonesService) {}

  @MessagePattern({ cmd: 'create_milestone' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(CreateMilestoneSchema))
  async create(
    @Payload()
    payload: {
      createMilestoneDto: CreateMilestoneDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Creating milestone "${payload.createMilestoneDto.title}" for project ID: ${payload.createMilestoneDto.projectId} by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.milestonesService.create(
        payload.createMilestoneDto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create milestone "${payload.createMilestoneDto.title}" by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'findAll_milestones' })
  @UsePipes(new JoiValidationPipe(FindMilestonesSchema))
  async findAll(
    @Payload()
    payload: {
      findAllMilestonesDto: FindAllMilestonesDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Fetching milestones for project ID: ${payload.findAllMilestonesDto.projectId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.milestonesService.findAll(
        payload.findAllMilestonesDto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch milestones for project ID ${payload.findAllMilestonesDto.projectId} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'findOne_milestones' })
  @UsePipes(new JoiValidationPipe(MilestoneIdSchema))
  async findOne(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching milestone ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.milestonesService.findOne(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch milestone ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_milestones' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR')
  @UsePipes(new JoiValidationPipe(UpdateMilestoneSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      updateMilestoneDto: UpdateMilestoneDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating milestone ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.milestonesService.update(
        payload.id,
        payload.updateMilestoneDto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update milestone ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'remove_milestones' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(MilestoneIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing milestone ID: ${payload.id} by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.milestonesService.remove(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to remove milestone ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'submit_milestones' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CONTRACTOR')
  @UsePipes(new JoiValidationPipe(MilestoneIdSchema))
  async submitForReview(
    @Payload() payload: { id: number; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Submitting milestone ID: ${payload.id} for review by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.milestonesService.submitForReview(
        payload.id,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to submit milestone ID ${payload.id} for review by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'create_milestone_review' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(CreateMilestoneReviewSchema))
  async createReview(
    @Payload()
    payload: {
      id: number;
      createMilestoneReviewDto: CreateMilestoneReviewDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Creating review for milestone ID: ${payload.id} by admin/inspector: ${payload.user.firebaseId}`,
    );
    try {
      return await this.milestonesService.createReview(
        payload.id,
        payload.createMilestoneReviewDto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create review for milestone ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
