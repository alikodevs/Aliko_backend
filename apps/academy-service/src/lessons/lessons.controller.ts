import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateLessonSchema,
  UpdateLessonSchema,
  LessonIdSchema,
  ModuleIdLessonSchema,
  FindLessonsSchema,
} from './lessons.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class LessonsController {
  private readonly logger = new Logger(LessonsController.name);
  constructor(private readonly lessonsService: LessonsService) {}

  @MessagePattern({ cmd: 'create_lesson' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateLessonSchema))
  async create(
    @Payload() payload: { dto: CreateLessonDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating lesson "${payload.dto.title}" in module ${payload.dto.moduleId} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.lessonsService.create(payload.dto, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to create lesson "${payload.dto.title}" in module ${payload.dto.moduleId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_lessons_by_module' })
  @UsePipes(new JoiValidationPipe(ModuleIdLessonSchema))
  async findByModule(
    @Payload()
    payload: {
      moduleId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    this.logger.log(
      `Fetching lessons for module ID: ${payload.moduleId} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.lessonsService.findByModule(
        payload.moduleId,
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch lessons for module ID ${payload.moduleId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_instructor_lessons' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(FindLessonsSchema))
  async findInstructorLessons(
    @Payload() payload: { user: AuthenticatedUser; query?: any },
  ) {
    this.logger.log(
      `Instructor ${payload.user.firebaseId} fetching their lessons`,
    );
    try {
      return await this.lessonsService.findByInstructor(
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${payload.user.firebaseId} failed to fetch their lessons: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_lesson_by_id' })
  @UsePipes(new JoiValidationPipe(LessonIdSchema))
  async findOne(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching details for lesson ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.lessonsService.findOne(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch details for lesson ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_lesson' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateLessonSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      dto: UpdateLessonDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating lesson ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.lessonsService.update(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update lesson ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'remove_lesson' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(LessonIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing lesson ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.lessonsService.remove(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to remove lesson ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
