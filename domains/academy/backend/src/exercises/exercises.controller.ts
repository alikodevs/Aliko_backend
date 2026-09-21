import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { SubmitExerciseDto } from './dto/submit-exercise.dto';
import { GradeExerciseDto } from './dto/grade-exercise.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
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

  @MessagePattern({ cmd: 'create_exercise' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateExerciseSchema))
  async create(
    @Payload() payload: { dto: CreateExerciseDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating exercise "${payload.dto.title}" for module ${payload.dto.moduleId} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.exercisesService.create(payload.dto, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to create exercise "${payload.dto.title}" for module ${payload.dto.moduleId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'create_bulk_exercises' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateBulkExercisesSchema))
  async createBulk(
    @Payload() payload: { dtos: CreateExerciseDto[]; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Bulk creating ${payload.dtos.length} exercises by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.exercisesService.createBulk(payload.dtos, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to bulk create exercises by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_exercises_by_module' })
  @UsePipes(new JoiValidationPipe(ModuleIdExerciseSchema))
  async findAllByModule(
    @Payload()
    payload: {
      moduleId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    this.logger.log(
      `Fetching exercises for module ID: ${payload.moduleId} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.exercisesService.findAllByModule(
        payload.moduleId,
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch exercises for module ID ${payload.moduleId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_instructor_exercises' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(FindExercisesSchema))
  async findInstructorExercises(
    @Payload() payload: { user: AuthenticatedUser; query?: any },
  ) {
    this.logger.log(
      `Instructor ${payload.user.firebaseId} fetching their exercises`,
    );
    try {
      return await this.exercisesService.findByInstructor(
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${payload.user.firebaseId} failed to fetch their exercises: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_exercise_by_id' })
  @UsePipes(new JoiValidationPipe(ExerciseIdSchema))
  async findOne(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching exercise details for ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.exercisesService.findOne(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch details for exercise ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_exercise' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateExerciseSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      dto: UpdateExerciseDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating exercise ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.exercisesService.update(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update exercise ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'remove_exercise' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ExerciseIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing exercise ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.exercisesService.remove(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to remove exercise ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'submit_exercise' })
  @UsePipes(new JoiValidationPipe(SubmitExerciseSchema))
  async submit(
    @Payload()
    payload: {
      id: number;
      dto: SubmitExerciseDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Student ${payload.user.firebaseId} submitting exercise ID: ${payload.id}`,
    );
    try {
      return await this.exercisesService.submit(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Student ${payload.user.firebaseId} failed to submit exercise ID ${payload.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'grade_exercise' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(GradeExerciseSchema))
  async grade(
    @Payload()
    payload: {
      id: number;
      dto: GradeExerciseDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Instructor ${payload.user.firebaseId} grading submission ID: ${payload.id}`,
    );
    try {
      return await this.exercisesService.grade(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${payload.user.firebaseId} failed to grade submission ID ${payload.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_instructor_submissions' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  async findInstructorSubmissions(
    @Payload() payload: { user: AuthenticatedUser; query?: any },
  ) {
    this.logger.log(
      `Instructor ${payload.user.firebaseId} fetching submissions for grading`,
    );
    try {
      return await this.exercisesService.findSubmissionsForInstructor(
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${payload.user.firebaseId} failed to fetch submissions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
