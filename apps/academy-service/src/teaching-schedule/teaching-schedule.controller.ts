import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TeachingScheduleService } from './teaching-schedule.service';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { CreateTeachingScheduleDto, UpdateTeachingScheduleDto } from './dto';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  InstructorOnlyScheduleSchema,
  CourseIdScheduleSchema,
  CreateTeachingScheduleSchema,
  UpdateTeachingScheduleSchema,
  ScheduleIdSchema,
} from './teaching-schedule.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class TeachingScheduleController {
  private readonly logger = new Logger(TeachingScheduleController.name);
  constructor(
    private readonly teachingScheduleService: TeachingScheduleService,
  ) {}

  @Get(['teaching-schedule/instructor', 'academy/teaching-schedule/instructor'])
  @MessagePattern({ cmd: 'get_instructor_schedules' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(InstructorOnlyScheduleSchema))
  async getInstructorSchedules(
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Instructor ${user.firebaseId} fetching their teaching schedules`,
    );
    try {
      return await this.teachingScheduleService.getInstructorSchedules(user);
    } catch (error) {
      this.logger.error(
        `Instructor ${user.firebaseId} failed to fetch their teaching schedules: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['teaching-schedule/course/:courseId', 'academy/teaching-schedule/course/:courseId'])
  @MessagePattern({ cmd: 'get_course_schedules' })
  @UseGuards(RoleGuard)
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CourseIdScheduleSchema))
  async getCourseSchedules(
    @Param('courseId') paramCourseId?: string,
    @Req() req?: any,
    @Payload() payload?: { courseId: number; user: AuthenticatedUser },
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
    this.logger.log(
      `Fetching schedules for course ID: ${courseId} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.teachingScheduleService.getCourseSchedules(courseId, user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch schedules for course ID ${courseId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(['teaching-schedule', 'academy/teaching-schedule'])
  @MessagePattern({ cmd: 'create_teaching_schedule' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateTeachingScheduleSchema))
  async createSchedule(
    @Body() body?: CreateTeachingScheduleDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      schedule: CreateTeachingScheduleDto;
      user: AuthenticatedUser;
    },
  ) {
    const schedule = payload?.schedule || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!schedule) {
      throw new BadRequestException('Schedule data is required');
    }
    this.logger.log(
      `Creating teaching schedule "${schedule.title}" for course ${schedule.courseId} by: ${user.firebaseId}`,
    );
    try {
      return await this.teachingScheduleService.createSchedule(schedule, user);
    } catch (error) {
      this.logger.error(
        `Failed to create teaching schedule "${schedule.title}" by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Patch(['teaching-schedule/:id', 'academy/teaching-schedule/:id'])
  @Put(['teaching-schedule/:id', 'academy/teaching-schedule/:id'])
  @MessagePattern({ cmd: 'update_teaching_schedule' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateTeachingScheduleSchema))
  async updateSchedule(
    @Param('id') paramId?: string,
    @Body() body?: UpdateTeachingScheduleDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      scheduleId: number;
      updateData: UpdateTeachingScheduleDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.scheduleId !== undefined ? payload.scheduleId : paramId;
    const scheduleId = Number(rawId);
    if (!scheduleId || isNaN(scheduleId)) {
      throw new BadRequestException('Invalid schedule ID');
    }
    const updateData = payload?.updateData || body;
    if (!updateData) {
      throw new BadRequestException('Update data is required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Updating teaching schedule ID: ${scheduleId} by owner: ${user.firebaseId}`,
    );
    try {
      return await this.teachingScheduleService.updateSchedule(scheduleId, updateData, user);
    } catch (error) {
      this.logger.error(
        `Failed to update teaching schedule ID ${scheduleId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(['teaching-schedule/:id', 'academy/teaching-schedule/:id'])
  @MessagePattern({ cmd: 'delete_teaching_schedule' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ScheduleIdSchema))
  async deleteSchedule(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { scheduleId: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.scheduleId !== undefined ? payload.scheduleId : paramId;
    const scheduleId = Number(rawId);
    if (!scheduleId || isNaN(scheduleId)) {
      throw new BadRequestException('Invalid schedule ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Deleting teaching schedule ID: ${scheduleId} by: ${user.firebaseId}`,
    );
    try {
      return await this.teachingScheduleService.deleteSchedule(scheduleId, user);
    } catch (error) {
      this.logger.error(
        `Failed to delete teaching schedule ID ${scheduleId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['teaching-schedule/:id', 'academy/teaching-schedule/:id'])
  @MessagePattern({ cmd: 'get_teaching_schedule' })
  @UseGuards(RoleGuard)
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ScheduleIdSchema))
  async getScheduleById(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { scheduleId: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.scheduleId !== undefined ? payload.scheduleId : paramId;
    const scheduleId = Number(rawId);
    if (!scheduleId || isNaN(scheduleId)) {
      throw new BadRequestException('Invalid schedule ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching schedule details for ID: ${scheduleId} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.teachingScheduleService.getScheduleById(scheduleId, user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch schedule details for ID ${scheduleId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
