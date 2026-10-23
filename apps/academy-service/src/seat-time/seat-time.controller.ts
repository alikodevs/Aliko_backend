import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
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

  /**
   * Record a heartbeat pulse from the LMS client.
   * Called every 30-60 seconds while the student is actively engaged.
   */
  @MessagePattern({ cmd: 'seat_time_heartbeat' })
  @UsePipes(new JoiValidationPipe(SeatTimeHeartbeatSchema))
  async heartbeat(
    @Payload()
    payload: {
      dto: SeatTimeHeartbeatDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.seatTimeService.recordHeartbeat(payload.dto, payload.user);
  }

  /**
   * Get seat-time summary for a course (per-lesson breakdown).
   * Students see their own; instructors/auditors can query any student.
   */
  @MessagePattern({ cmd: 'get_seat_time_summary' })
  @UsePipes(new JoiValidationPipe(SeatTimeSummarySchema))
  async getCourseSummary(
    @Payload()
    payload: {
      courseId: number;
      userId?: string;
      user: AuthenticatedUser;
    },
  ) {
    return this.seatTimeService.getCourseSummary(
      payload.courseId,
      payload.userId,
      payload.user,
    );
  }

  /**
   * Get seat-time for a specific lesson.
   */
  @MessagePattern({ cmd: 'get_seat_time_lesson' })
  @UsePipes(new JoiValidationPipe(SeatTimeLessonSchema))
  async getLessonSeatTime(
    @Payload()
    payload: {
      courseId: number;
      lessonId: number;
      userId?: string;
      user: AuthenticatedUser;
    },
  ) {
    return this.seatTimeService.getLessonSeatTime(
      payload.courseId,
      payload.lessonId,
      payload.userId,
      payload.user,
    );
  }

  /**
   * Cohort-wide seat-time audit report (instructors & auditors only).
   */
  @MessagePattern({ cmd: 'get_cohort_seat_time_report' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR')
  async getCohortReport(
    @Payload()
    payload: {
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.seatTimeService.getCohortReport(
      payload.cohortId,
      payload.user,
    );
  }
}
