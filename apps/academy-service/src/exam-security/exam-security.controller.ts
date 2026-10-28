import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Param,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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

  @Post(['exam-security/sessions/start', 'academy/exam-security/sessions/start'])
  @MessagePattern({ cmd: 'start_exam_session' })
  @UsePipes(new JoiValidationPipe(StartExamSessionSchema))
  async startSession(
    @Body() body?: StartExamSessionDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: StartExamSessionDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Exam session data is required');
    }
    this.logger.log(
      `Starting exam session for exercise ${dto.exerciseId} by user ${user.firebaseId}`,
    );
    return this.examSecurityService.startSession(dto, user);
  }

  @Post(['exam-security/sessions/tab-blur', 'academy/exam-security/sessions/tab-blur'])
  @MessagePattern({ cmd: 'record_exam_tab_blur' })
  @UsePipes(new JoiValidationPipe(RecordTabBlurSchema))
  async recordTabBlur(
    @Body() body?: RecordTabBlurDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: RecordTabBlurDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Tab blur data is required');
    }
    return this.examSecurityService.recordTabBlur(dto, user);
  }

  @Post(['exam-security/sessions/end', 'academy/exam-security/sessions/end'])
  @MessagePattern({ cmd: 'end_exam_session' })
  @UsePipes(new JoiValidationPipe(EndExamSessionSchema))
  async endSession(
    @Body() body?: EndExamSessionDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: EndExamSessionDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('End session data is required');
    }
    this.logger.log(
      `Ending exam session ${dto.sessionId} by user ${user.firebaseId}`,
    );
    return this.examSecurityService.endSession(dto, user);
  }

  @Get([
    'exam-security/sessions/:sessionId',
    'academy/exam-security/sessions/:sessionId',
    'exam-security/sessions/by-id/:sessionId',
    'academy/exam-security/sessions/by-id/:sessionId',
  ])
  @MessagePattern({ cmd: 'get_exam_session' })
  @UsePipes(new JoiValidationPipe(ExamSessionIdSchema))
  async getSession(
    @Param('sessionId') paramSessionId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      sessionId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawSessionId = payload?.sessionId !== undefined ? payload.sessionId : paramSessionId;
    const sessionId = Number(rawSessionId);
    if (!sessionId || isNaN(sessionId)) {
      throw new BadRequestException('Invalid session ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.examSecurityService.getSession(sessionId, user);
  }

  @Get([
    'exam-security/sessions/exercise/:exerciseId',
    'academy/exam-security/sessions/exercise/:exerciseId',
  ])
  @MessagePattern({ cmd: 'get_exercise_exam_sessions' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR')
  @UsePipes(new JoiValidationPipe(ExerciseExamSessionsSchema))
  async getSessionsByExercise(
    @Param('exerciseId') paramExerciseId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      exerciseId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawExerciseId = payload?.exerciseId !== undefined ? payload.exerciseId : paramExerciseId;
    const exerciseId = Number(rawExerciseId);
    if (!exerciseId || isNaN(exerciseId)) {
      throw new BadRequestException('Invalid exercise ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.examSecurityService.getSessionsByExercise(
      exerciseId,
      user,
    );
  }

  @Post(['exam-security/sessions/audit', 'academy/exam-security/sessions/audit'])
  @MessagePattern({ cmd: 'audit_exam_session' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR')
  @UsePipes(new JoiValidationPipe(AuditExamSessionSchema))
  async auditSession(
    @Body() body?: AuditExamSessionDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: AuditExamSessionDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Audit data is required');
    }
    this.logger.log(
      `Auditing exam session ${dto.sessionId} by ${user.firebaseId}`,
    );
    return this.examSecurityService.auditSession(dto, user);
  }
}
