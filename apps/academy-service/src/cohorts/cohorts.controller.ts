import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
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
export class CohortsController {
  private readonly logger = new Logger(CohortsController.name);
  constructor(private readonly cohortsService: CohortsService) {}

  @Post(['cohorts', 'academy/cohorts'])
  @MessagePattern({ cmd: 'create_cohort' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateCohortSchema))
  async create(
    @Body() body?: CreateCohortDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CreateCohortDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Cohort data required');
    }
    this.logger.log(
      `Creating cohort "${dto.name}" for course ${dto.courseId} by user: ${user.firebaseId}`,
    );
    try {
      return await this.cohortsService.create(dto, user);
    } catch (error) {
      this.logger.error(
        `Failed to create cohort "${dto.name}" for course ${dto.courseId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['cohorts', 'academy/cohorts'])
  @MessagePattern({ cmd: 'find_all_cohorts' })
  async findAll(@Query() query?: any, @Payload() payload?: { query?: any }) {
    const q = payload?.query || query || {};
    this.logger.log(
      `Fetching all cohorts with query: ${JSON.stringify(q)}`,
    );
    try {
      return await this.cohortsService.findAll(q);
    } catch (error) {
      this.logger.error(
        `Failed to fetch all cohorts with query ${JSON.stringify(q)}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['cohorts/instructor', 'academy/cohorts/instructor'])
  @MessagePattern({ cmd: 'find_instructor_cohorts' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(InstructorOnlyEventsSchema))
  async findInstructorCohorts(
    @Query() query?: any,
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser; query?: any },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query || {};
    this.logger.log(
      `Instructor ${user.firebaseId} fetching their cohorts`,
    );
    try {
      return await this.cohortsService.findByInstructor(
        user,
        q,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${user.firebaseId} failed to fetch their cohorts: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['cohorts/:id', 'academy/cohorts/:id'])
  @MessagePattern({ cmd: 'find_cohort_by_id' })
  async findOne(@Param('id') paramId?: string, @Payload() payload?: { id: number }) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid cohort ID');
    }
    this.logger.log(`Fetching details for cohort ID: ${id}`);
    try {
      return await this.cohortsService.findOne(id);
    } catch (error) {
      this.logger.error(
        `Failed to fetch details for cohort ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(['cohorts/:id', 'academy/cohorts/:id'])
  @Patch(['cohorts/:id', 'academy/cohorts/:id'])
  @MessagePattern({ cmd: 'update_cohort' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateCohortSchema))
  async update(
    @Param('id') paramId?: string,
    @Body() body?: UpdateCohortDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      dto: UpdateCohortDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid cohort ID');
    }
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Cohort update data required');
    }
    this.logger.log(
      `Updating cohort ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.cohortsService.update(
        id,
        dto,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update cohort ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(['cohorts/:id', 'academy/cohorts/:id'])
  @MessagePattern({ cmd: 'remove_cohort' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CohortIdSchema))
  async remove(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid cohort ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Removing cohort ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.cohortsService.remove(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to remove cohort ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
