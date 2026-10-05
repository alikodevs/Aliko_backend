import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CohortsService } from './cohorts.service';
import { CreateCohortDto } from './dto/create-cohort.dto';
import { UpdateCohortDto } from './dto/update-cohort.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateCohortSchema,
  UpdateCohortSchema,
  CohortIdSchema,
  FindCohortsSchema,
  InstructorOnlyEventsSchema,
} from './cohorts.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class CohortsController {
  private readonly logger = new Logger(CohortsController.name);
  constructor(private readonly cohortsService: CohortsService) {}

  @MessagePattern({ cmd: 'create_cohort' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateCohortSchema))
  async create(
    @Payload() payload: { dto: CreateCohortDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating cohort "${payload.dto.name}" for course ${payload.dto.courseId} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.cohortsService.create(payload.dto, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to create cohort "${payload.dto.name}" for course ${payload.dto.courseId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_all_cohorts' })
  @UsePipes(new JoiValidationPipe(FindCohortsSchema))
  async findAll(@Payload() payload: { query?: any }) {
    this.logger.log(
      `Fetching all cohorts with query: ${JSON.stringify(payload.query || {})}`,
    );
    try {
      return await this.cohortsService.findAll(payload.query);
    } catch (error) {
      this.logger.error(
        `Failed to fetch all cohorts with query ${JSON.stringify(payload.query || {})}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_instructor_cohorts' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(InstructorOnlyEventsSchema))
  async findInstructorCohorts(
    @Payload() payload: { user: AuthenticatedUser; query?: any },
  ) {
    this.logger.log(
      `Instructor ${payload.user.firebaseId} fetching their cohorts`,
    );
    try {
      return await this.cohortsService.findByInstructor(
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${payload.user.firebaseId} failed to fetch their cohorts: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_cohort_by_id' })
  @UsePipes(new JoiValidationPipe(CohortIdSchema))
  async findOne(@Payload() payload: { id: number }) {
    this.logger.log(`Fetching details for cohort ID: ${payload.id}`);
    try {
      return await this.cohortsService.findOne(payload.id);
    } catch (error) {
      this.logger.error(
        `Failed to fetch details for cohort ID ${payload.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_cohort' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateCohortSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      dto: UpdateCohortDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating cohort ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.cohortsService.update(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update cohort ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'remove_cohort' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CohortIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing cohort ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.cohortsService.remove(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to remove cohort ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
