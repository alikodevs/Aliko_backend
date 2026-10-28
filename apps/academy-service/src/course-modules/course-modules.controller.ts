import {
  Controller,
  UseGuards,
  UseFilters,
  UsePipes,
  Logger,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UnauthorizedException,
  BadRequestException,
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

  @Post(['modules', 'academy/modules', 'course-modules', 'academy/course-modules'])
  @MessagePattern({ cmd: 'create_course_module' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateCourseModuleSchema))
  async create(
    @Body() body?: CreateCourseModuleDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CreateCourseModuleDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Module data required');
    }
    this.logger.log(
      `Creating course module "${dto.title}" for course ${dto.courseId} by user: ${user.firebaseId}`,
    );
    try {
      return await this.courseModulesService.create(dto, user);
    } catch (error) {
      this.logger.error(
        `Failed to create course module "${dto.title}" for course ${dto.courseId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['modules', 'academy/modules', 'course-modules', 'academy/course-modules'])
  @MessagePattern({ cmd: 'find_all_modules' })
  @UsePipes(new JoiValidationPipe(FindAllModulesSchema))
  async findAll(
    @Query() query?: any,
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser; query?: any },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query;
    this.logger.log(
      `Fetching all modules (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.courseModulesService.findAll(user, q);
    } catch (error) {
      this.logger.error(
        `Failed to fetch all modules by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get([
    'modules/course/:courseId',
    'academy/modules/course/:courseId',
    'course-modules/course/:courseId',
    'academy/course-modules/course/:courseId',
  ])
  @MessagePattern({ cmd: 'find_modules_by_course' })
  @UsePipes(new JoiValidationPipe(CourseIdModuleSchema))
  async findAllByCourse(
    @Param('courseId') paramCourseId?: string,
    @Query() query?: any,
    @Req() req?: any,
    @Payload()
    payload?: {
      courseId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const courseId = Number(rawCourseId);
    if (!courseId || isNaN(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query;
    this.logger.log(
      `Fetching modules for course ID: ${courseId} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.courseModulesService.findAllByCourse(courseId, user, q);
    } catch (error) {
      this.logger.error(
        `Failed to fetch modules for course ID ${courseId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get([
    'modules/:id',
    'academy/modules/:id',
    'course-modules/:id',
    'academy/course-modules/:id',
  ])
  @MessagePattern({ cmd: 'find_module_by_id' })
  @UsePipes(new JoiValidationPipe(ModuleIdSchema))
  async findOne(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid module ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching module details for ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.courseModulesService.findOne(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch details for module ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get([
    'modules/:id/instructor',
    'academy/modules/:id/instructor',
    'course-modules/:id/instructor',
    'academy/course-modules/:id/instructor',
  ])
  @MessagePattern({ cmd: 'get_instructor_module' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ModuleIdSchema))
  async findOneForInstructor(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid module ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Instructor ${user.firebaseId} fetching module ID: ${id}`,
    );
    try {
      return await this.courseModulesService.findOneForInstructor(id, user);
    } catch (error) {
      this.logger.error(
        `Instructor ${user.firebaseId} failed to fetch module ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put([
    'modules/:id',
    'academy/modules/:id',
    'course-modules/:id',
    'academy/course-modules/:id',
  ])
  @Patch([
    'modules/:id',
    'academy/modules/:id',
    'course-modules/:id',
    'academy/course-modules/:id',
  ])
  @MessagePattern({ cmd: 'update_course_module' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateCourseModuleSchema))
  async update(
    @Param('id') paramId?: string,
    @Body() body?: UpdateCourseModuleDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      dto: UpdateCourseModuleDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid module ID');
    }
    const dto = payload?.dto || body;
    if (!dto) {
      throw new BadRequestException('Module update data required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Updating module ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.courseModulesService.update(id, dto, user);
    } catch (error) {
      this.logger.error(
        `Failed to update module ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete([
    'modules/:id',
    'academy/modules/:id',
    'course-modules/:id',
    'academy/course-modules/:id',
  ])
  @MessagePattern({ cmd: 'remove_course_module' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ModuleIdSchema))
  async remove(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid module ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Removing module ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.courseModulesService.remove(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to remove module ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
