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
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { SubmitExerciseDto } from './dto/submit-exercise.dto';
import { GradeExerciseDto } from './dto/grade-exercise.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateExerciseSchema,
  UpdateExerciseSchema,
  ExerciseIdSchema,
  ModuleIdExerciseSchema,
  FindExercisesSchema,
  SubmitExerciseSchema,
  GradeExerciseSchema,
  CreateBulkExercisesSchema,
} from './exercises.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class ExercisesController {
  private readonly logger = new Logger(ExercisesController.name);
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post(['exercises', 'academy/exercises'])
  @MessagePattern({ cmd: 'create_exercise' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateExerciseSchema))
  async create(
    @Body() body?: CreateExerciseDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CreateExerciseDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Exercise data required');
    }
    this.logger.log(
      `Creating exercise "${dto.title}" for module ${dto.moduleId} by user: ${user.firebaseId}`,
    );
    try {
      return await this.exercisesService.create(dto, user);
    } catch (error) {
      this.logger.error(
        `Failed to create exercise "${dto.title}" for module ${dto.moduleId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(['exercises/bulk', 'academy/exercises/bulk'])
  @MessagePattern({ cmd: 'create_bulk_exercises' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateBulkExercisesSchema))
  async createBulk(
    @Body() body?: any,
    @Req() req?: any,
    @Payload() payload?: { dtos: CreateExerciseDto[]; user: AuthenticatedUser },
  ) {
    const dtos: CreateExerciseDto[] = payload?.dtos || (Array.isArray(body) ? body : body?.dtos);
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dtos || !Array.isArray(dtos)) {
      throw new BadRequestException('Array of exercise data required');
    }
    this.logger.log(
      `Bulk creating ${dtos.length} exercises by user: ${user.firebaseId}`,
    );
    try {
      return await this.exercisesService.createBulk(dtos, user);
    } catch (error) {
      this.logger.error(
        `Failed to bulk create exercises by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['exercises/module/:moduleId', 'academy/exercises/module/:moduleId'])
  @MessagePattern({ cmd: 'find_exercises_by_module' })
  async findAllByModule(
    @Param('moduleId') paramModuleId?: string,
    @Query() query?: any,
    @Req() req?: any,
    @Payload()
    payload?: {
      moduleId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    const rawModuleId = payload?.moduleId !== undefined ? payload.moduleId : paramModuleId;
    const moduleId = Number(rawModuleId);
    if (!moduleId || isNaN(moduleId)) {
      throw new BadRequestException('Invalid module ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query || {};
    this.logger.log(
      `Fetching exercises for module ID: ${moduleId} by user: ${user.firebaseId}`,
    );
    try {
      return await this.exercisesService.findAllByModule(
        moduleId,
        user,
        q,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch exercises for module ID ${moduleId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['exercises/instructor', 'academy/exercises/instructor'])
  @MessagePattern({ cmd: 'find_instructor_exercises' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(FindExercisesSchema))
  async findInstructorExercises(
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
      `Instructor ${user.firebaseId} fetching their exercises`,
    );
    try {
      return await this.exercisesService.findByInstructor(
        user,
        q,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${user.firebaseId} failed to fetch their exercises: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['exercises/:id', 'academy/exercises/:id'])
  @MessagePattern({ cmd: 'find_exercise_by_id' })
  async findOne(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid exercise ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching exercise details for ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.exercisesService.findOne(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch details for exercise ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(['exercises/:id', 'academy/exercises/:id'])
  @Patch(['exercises/:id', 'academy/exercises/:id'])
  @MessagePattern({ cmd: 'update_exercise' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateExerciseSchema))
  async update(
    @Param('id') paramId?: string,
    @Body() body?: UpdateExerciseDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      dto: UpdateExerciseDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid exercise ID');
    }
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Update data required');
    }
    this.logger.log(
      `Updating exercise ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.exercisesService.update(
        id,
        dto,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update exercise ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(['exercises/:id', 'academy/exercises/:id'])
  @MessagePattern({ cmd: 'remove_exercise' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ExerciseIdSchema))
  async remove(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid exercise ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Removing exercise ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.exercisesService.remove(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to remove exercise ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(['exercises/:id/submit', 'academy/exercises/:id/submit'])
  @MessagePattern({ cmd: 'submit_exercise' })
  @UsePipes(new JoiValidationPipe(SubmitExerciseSchema))
  async submit(
    @Param('id') paramId?: string,
    @Body() body?: SubmitExerciseDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      dto: SubmitExerciseDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid exercise ID');
    }
    const dto = payload?.dto || body;
    if (!dto) {
      throw new BadRequestException('Submission data required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Student ${user.firebaseId} submitting exercise ID: ${id}`,
    );
    try {
      return await this.exercisesService.submit(
        id,
        dto,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Student ${user.firebaseId} failed to submit exercise ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(['exercises/submissions/:id/grade', 'academy/exercises/submissions/:id/grade'])
  @MessagePattern({ cmd: 'grade_exercise' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(GradeExerciseSchema))
  async grade(
    @Param('id') paramId?: string,
    @Body() body?: GradeExerciseDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      dto: GradeExerciseDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid submission ID');
    }
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Grade data required');
    }
    this.logger.log(
      `Instructor ${user.firebaseId} grading submission ID: ${id}`,
    );
    try {
      return await this.exercisesService.grade(
        id,
        dto,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${user.firebaseId} failed to grade submission ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['exercises/submissions/instructor', 'academy/exercises/submissions/instructor'])
  @MessagePattern({ cmd: 'find_instructor_submissions' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  async findInstructorSubmissions(
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
      `Instructor ${user.firebaseId} fetching submissions for grading`,
    );
    try {
      return await this.exercisesService.findSubmissionsForInstructor(
        user,
        q,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${user.firebaseId} failed to fetch submissions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
