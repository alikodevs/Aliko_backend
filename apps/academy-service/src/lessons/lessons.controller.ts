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
  Param,
  Body,
  Query,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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

  @Post(['lessons', 'academy/lessons'])
  @MessagePattern({ cmd: 'create_lesson' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateLessonSchema))
  async create(
    @Body() body?: CreateLessonDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CreateLessonDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Lesson data is required');
    }
    this.logger.log(
      `Creating lesson "${dto.title}" in module ${dto.moduleId} by user: ${user.firebaseId}`,
    );
    try {
      return await this.lessonsService.create(dto, user);
    } catch (error) {
      this.logger.error(
        `Failed to create lesson "${dto.title}" in module ${dto.moduleId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['lessons/module/:moduleId', 'academy/lessons/module/:moduleId'])
  @MessagePattern({ cmd: 'find_lessons_by_module' })
  @UsePipes(new JoiValidationPipe(ModuleIdLessonSchema))
  async findByModule(
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
    const q = payload?.query || query;
    this.logger.log(
      `Fetching lessons for module ID: ${moduleId} by user: ${user.firebaseId}`,
    );
    try {
      return await this.lessonsService.findByModule(moduleId, user, q);
    } catch (error) {
      this.logger.error(
        `Failed to fetch lessons for module ID ${moduleId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['lessons/instructor', 'academy/lessons/instructor'])
  @MessagePattern({ cmd: 'find_instructor_lessons' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(FindLessonsSchema))
  async findInstructorLessons(
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
      `Instructor ${user.firebaseId} fetching their lessons`,
    );
    try {
      return await this.lessonsService.findByInstructor(user, q);
    } catch (error) {
      this.logger.error(
        `Instructor ${user.firebaseId} failed to fetch their lessons: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['lessons/:id', 'academy/lessons/:id'])
  @MessagePattern({ cmd: 'find_lesson_by_id' })
  @UsePipes(new JoiValidationPipe(LessonIdSchema))
  async findOne(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid lesson ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching details for lesson ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.lessonsService.findOne(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch details for lesson ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(['lessons/:id', 'academy/lessons/:id'])
  @Patch(['lessons/:id', 'academy/lessons/:id'])
  @MessagePattern({ cmd: 'update_lesson' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateLessonSchema))
  async update(
    @Param('id') paramId?: string,
    @Body() body?: UpdateLessonDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      dto: UpdateLessonDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid lesson ID');
    }
    const dto = payload?.dto || body;
    if (!dto) {
      throw new BadRequestException('Lesson update data required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Updating lesson ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.lessonsService.update(id, dto, user);
    } catch (error) {
      this.logger.error(
        `Failed to update lesson ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(['lessons/:id', 'academy/lessons/:id'])
  @MessagePattern({ cmd: 'remove_lesson' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(LessonIdSchema))
  async remove(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid lesson ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Removing lesson ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.lessonsService.remove(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to remove lesson ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
