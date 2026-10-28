import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SeatTimeService } from './seat-time.service';
import { SeatTimeHeartbeatDto } from './dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  SeatTimeHeartbeatSchema,
  SeatTimeSummarySchema,
  SeatTimeLessonSchema,
} from './seat-time.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class SeatTimeController {
  private readonly logger = new Logger(SeatTimeController.name);

  constructor(private readonly seatTimeService: SeatTimeService) {}

  @Post(['seat-time/heartbeat', 'academy/seat-time/heartbeat'])
  @MessagePattern({ cmd: 'seat_time_heartbeat' })
  @UsePipes(new JoiValidationPipe(SeatTimeHeartbeatSchema))
  async heartbeat(
    @Body() body?: SeatTimeHeartbeatDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: SeatTimeHeartbeatDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Heartbeat data required');
    }
    return this.seatTimeService.recordHeartbeat(dto, user);
  }

  @Get(['seat-time/summary/course/:courseId', 'academy/seat-time/summary/course/:courseId'])
  @MessagePattern({ cmd: 'get_seat_time_summary' })
  @UsePipes(new JoiValidationPipe(SeatTimeSummarySchema))
  async getCourseSummary(
    @Param('courseId') paramCourseId?: string,
    @Query('userId') queryUserId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      courseId: number;
      userId?: string;
      user: AuthenticatedUser;
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
    const userId = payload?.userId || queryUserId;
    return this.seatTimeService.getCourseSummary(
      courseId,
      userId,
      user,
    );
  }

  @Get([
    'seat-time/lesson/:lessonId/course/:courseId',
    'academy/seat-time/lesson/:lessonId/course/:courseId',
  ])
  @MessagePattern({ cmd: 'get_seat_time_lesson' })
  @UsePipes(new JoiValidationPipe(SeatTimeLessonSchema))
  async getLessonSeatTime(
    @Param('courseId') paramCourseId?: string,
    @Param('lessonId') paramLessonId?: string,
    @Query('userId') queryUserId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      courseId: number;
      lessonId: number;
      userId?: string;
      user: AuthenticatedUser;
    },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const courseId = Number(rawCourseId);
    const rawLessonId = payload?.lessonId !== undefined ? payload.lessonId : paramLessonId;
    const lessonId = Number(rawLessonId);
    if (!courseId || !lessonId || isNaN(courseId) || isNaN(lessonId)) {
      throw new BadRequestException('Invalid course or lesson ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const userId = payload?.userId || queryUserId;
    return this.seatTimeService.getLessonSeatTime(
      courseId,
      lessonId,
      userId,
      user,
    );
  }

  @Get(['seat-time/cohort/:cohortId/report', 'academy/seat-time/cohort/:cohortId/report'])
  @MessagePattern({ cmd: 'get_cohort_seat_time_report' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR')
  async getCohortReport(
    @Param('cohortId') paramCohortId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawCohortId = payload?.cohortId !== undefined ? payload.cohortId : paramCohortId;
    const cohortId = Number(rawCohortId);
    if (!cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Invalid cohort ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.seatTimeService.getCohortReport(
      cohortId,
      user,
    );
  }
}
