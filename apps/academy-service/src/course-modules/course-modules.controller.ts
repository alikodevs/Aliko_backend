import {
  Controller,
  UseGuards,
  UseFilters,
  UsePipes,
  Logger,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CourseModulesService } from './course-modules.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateCourseModuleSchema,
  UpdateCourseModuleSchema,
  ModuleIdSchema,
  CourseIdModuleSchema,
  FindAllModulesSchema,
} from './course-modules.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
@UseFilters(RpcExceptionFilter)
export class CourseModulesController {
  private readonly logger = new Logger(CourseModulesController.name);
  constructor(private readonly courseModulesService: CourseModulesService) {}

  @MessagePattern({ cmd: 'create_course_module' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateCourseModuleSchema))
  async create(
    @Payload() payload: { dto: CreateCourseModuleDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating course module "${payload.dto.title}" for course ${payload.dto.courseId} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.courseModulesService.create(payload.dto, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to create course module "${payload.dto.title}" for course ${payload.dto.courseId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_all_modules' })
  @UsePipes(new JoiValidationPipe(FindAllModulesSchema))
  async findAll(@Payload() payload: { user: AuthenticatedUser; query?: any }) {
    this.logger.log(
      `Fetching all modules (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.courseModulesService.findAll(
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch all modules by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_modules_by_course' })
  @UsePipes(new JoiValidationPipe(CourseIdModuleSchema))
  async findAllByCourse(
    @Payload()
    payload: {
      courseId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    this.logger.log(
      `Fetching modules for course ID: ${payload.courseId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.courseModulesService.findAllByCourse(
        payload.courseId,
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch modules for course ID ${payload.courseId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_module_by_id' })
  @UsePipes(new JoiValidationPipe(ModuleIdSchema))
  async findOne(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching module details for ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.courseModulesService.findOne(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch details for module ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_instructor_module' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ModuleIdSchema))
  async findOneForInstructor(
    @Payload() payload: { id: number; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Instructor ${payload.user.firebaseId} fetching module ID: ${payload.id}`,
    );
    try {
      return await this.courseModulesService.findOneForInstructor(
        payload.id,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${payload.user.firebaseId} failed to fetch module ID ${payload.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_course_module' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateCourseModuleSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      dto: UpdateCourseModuleDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating module ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.courseModulesService.update(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update module ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'remove_course_module' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ModuleIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing module ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.courseModulesService.remove(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to remove module ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
