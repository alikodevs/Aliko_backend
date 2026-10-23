import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExamSecurityService } from './exam-security.service';
import {
  StartExamSessionDto,
  RecordTabBlurDto,
  EndExamSessionDto,
  AuditExamSessionDto,
} from './dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  StartExamSessionSchema,
  RecordTabBlurSchema,
  EndExamSessionSchema,
  AuditExamSessionSchema,
  ExamSessionIdSchema,
  ExerciseExamSessionsSchema,
} from './exam-security.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class ExamSecurityController {
  private readonly logger = new Logger(ExamSecurityController.name);

  constructor(private readonly examSecurityService: ExamSecurityService) {}

  @MessagePattern({ cmd: 'start_exam_session' })
  @UsePipes(new JoiValidationPipe(StartExamSessionSchema))
  async startSession(
    @Payload()
    payload: {
      dto: StartExamSessionDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Starting exam session for exercise ${payload.dto.exerciseId} by user ${payload.user.firebaseId}`,
    );
    return this.examSecurityService.startSession(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'record_exam_tab_blur' })
  @UsePipes(new JoiValidationPipe(RecordTabBlurSchema))
  async recordTabBlur(
    @Payload()
    payload: {
      dto: RecordTabBlurDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.examSecurityService.recordTabBlur(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'end_exam_session' })
  @UsePipes(new JoiValidationPipe(EndExamSessionSchema))
  async endSession(
    @Payload()
    payload: {
      dto: EndExamSessionDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Ending exam session ${payload.dto.sessionId} by user ${payload.user.firebaseId}`,
    );
    return this.examSecurityService.endSession(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'get_exam_session' })
  @UsePipes(new JoiValidationPipe(ExamSessionIdSchema))
  async getSession(
    @Payload()
    payload: {
      sessionId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.examSecurityService.getSession(payload.sessionId, payload.user);
  }

  @MessagePattern({ cmd: 'get_exercise_exam_sessions' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR')
  @UsePipes(new JoiValidationPipe(ExerciseExamSessionsSchema))
  async getSessionsByExercise(
    @Payload()
    payload: {
      exerciseId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.examSecurityService.getSessionsByExercise(
      payload.exerciseId,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'audit_exam_session' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR')
  @UsePipes(new JoiValidationPipe(AuditExamSessionSchema))
  async auditSession(
    @Payload()
    payload: {
      dto: AuditExamSessionDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Auditing exam session ${payload.dto.sessionId} by ${payload.user.firebaseId}`,
    );
    return this.examSecurityService.auditSession(payload.dto, payload.user);
  }
}
