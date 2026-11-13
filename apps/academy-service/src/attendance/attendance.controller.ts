import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AttendanceService } from './attendance.service';
import {
  AttendanceReportQueryDto,
  AttendanceOverrideDto,
  RunCensusDto,
} from './dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  AttendanceReportQuerySchema,
  AttendanceOverrideSchema,
  CohortIdParamSchema,
  CourseIdParamSchema,
} from './attendance.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class AttendanceController {
  private readonly logger = new Logger(AttendanceController.name);

  constructor(private readonly attendanceService: AttendanceService) {}

  @Get(['attendance/first-week/report', 'academy/attendance/first-week/report'])
  @MessagePattern({ cmd: 'get_week_one_attendance_report' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR')
  @UsePipes(new JoiValidationPipe(AttendanceReportQuerySchema))
  async getWeekOneAttendanceReport(
    @Query() query?: any,
    @Req() req?: any,
    @Payload()
    payload?: {
      query: AttendanceReportQueryDto;
      user: AuthenticatedUser;
    },
  ) {
    const q: AttendanceReportQueryDto = payload?.query || {
      cohortId: query?.cohortId ? Number(query.cohortId) : undefined,
      courseId: query?.courseId ? Number(query.courseId) : undefined,
    };
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!q.cohortId && !q.courseId) {
      throw new BadRequestException('Either cohortId or courseId must be provided in query');
    }
    this.logger.log(
      `Fetching Week-1 Attendance Census Report (cohort: ${q.cohortId || 'N/A'}, course: ${q.courseId || 'N/A'}) by ${user.firebaseId}`,
    );
    return this.attendanceService.getWeekOneAttendanceReport(q, user);
  }

  @Get([
    'attendance/gate-assignment/:courseId',
    'academy/attendance/gate-assignment/:courseId',
  ])
  @MessagePattern({ cmd: 'get_gate_assignment' })
  @UsePipes(new JoiValidationPipe(CourseIdParamSchema))
  async getGateAssignment(
    @Param('courseId') paramCourseId?: string,
    @Payload() payload?: { courseId: number },
  ) {
    const rawId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const courseId = Number(rawId);
    if (!courseId || isNaN(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }
    return this.attendanceService.getGateAssignment(courseId);
  }

  @Post(['attendance/run-census/:cohortId', 'academy/attendance/run-census/:cohortId'])
  @MessagePattern({ cmd: 'run_cohort_census' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CohortIdParamSchema))
  async runCohortCensus(
    @Param('cohortId') paramCohortId?: string,
    @Body() body?: RunCensusDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      cohortId: number;
      dto?: RunCensusDto;
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
    const reason = payload?.dto?.reason || body?.reason;
    this.logger.log(
      `Triggering Day 7 Census Sweep for cohort ${cohortId} by ${user.firebaseId}`,
    );
    return this.attendanceService.runCohortCensus(cohortId, user, reason);
  }

  @Patch(['attendance/override/:enrollmentId', 'academy/attendance/override/:enrollmentId'])
  @MessagePattern({ cmd: 'override_attendance' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(AttendanceOverrideSchema))
  async overrideAttendance(
    @Param('enrollmentId') paramEnrollmentId?: string,
    @Body() body?: AttendanceOverrideDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      enrollmentId: number;
      dto: AttendanceOverrideDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId =
      payload?.enrollmentId !== undefined ? payload.enrollmentId : paramEnrollmentId;
    const enrollmentId = Number(rawId);
    if (!enrollmentId || isNaN(enrollmentId)) {
      throw new BadRequestException('Invalid enrollment ID');
    }
    const dto = payload?.dto || body;
    if (!dto || !dto.status) {
      throw new BadRequestException('Attendance status is required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Overriding attendance for enrollment ${enrollmentId} to ${dto.status} by ${user.firebaseId}`,
    );
    return this.attendanceService.overrideAttendance(enrollmentId, dto, user);
  }
}

