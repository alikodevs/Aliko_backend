import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClinicalService } from './clinical.service';
import { CreateClinicalShiftDto, RecordClinicalAttendanceDto, UpdateClinicalAttendanceDto } from './dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateClinicalShiftSchema,
  RecordClinicalAttendanceSchema,
  UpdateClinicalAttendanceSchema,
  CohortClinicalSchema,
  StudentClinicalHoursSchema,
  ShiftIdSchema,
} from './clinical.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class ClinicalController {
  private readonly logger = new Logger(ClinicalController.name);

  constructor(private readonly clinicalService: ClinicalService) {}

  @Post(['clinical/shifts', 'academy/clinical/shifts'])
  @MessagePattern({ cmd: 'create_clinical_shift' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateClinicalShiftSchema))
  async createShift(
    @Body() body?: CreateClinicalShiftDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: CreateClinicalShiftDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Shift data is required');
    }
    this.logger.log(
      `Creating clinical shift at "${dto.facilityName}" by instructor ${user.firebaseId}`,
    );
    return this.clinicalService.createShift(dto, user);
  }

  @Get(['clinical/shifts/cohort/:cohortId', 'academy/clinical/shifts/cohort/:cohortId'])
  @MessagePattern({ cmd: 'find_cohort_clinical_shifts' })
  @UsePipes(new JoiValidationPipe(CohortClinicalSchema))
  async findByCohort(
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
    return this.clinicalService.findByCohort(cohortId, user);
  }

  @Get(['clinical/shifts/:shiftId', 'academy/clinical/shifts/:shiftId'])
  @MessagePattern({ cmd: 'get_clinical_shift' })
  @UsePipes(new JoiValidationPipe(ShiftIdSchema))
  async getShift(
    @Param('shiftId') paramShiftId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      shiftId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawShiftId = payload?.shiftId !== undefined ? payload.shiftId : paramShiftId;
    const shiftId = Number(rawShiftId);
    if (!shiftId || isNaN(shiftId)) {
      throw new BadRequestException('Invalid shift ID');
    }
    return this.clinicalService.getShift(shiftId);
  }

  @Post(['clinical/attendance', 'academy/clinical/attendance'])
  @MessagePattern({ cmd: 'record_clinical_attendance' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(RecordClinicalAttendanceSchema))
  async recordAttendance(
    @Body() body?: RecordClinicalAttendanceDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: RecordClinicalAttendanceDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Attendance data is required');
    }
    this.logger.log(
      `Recording clinical attendance: student ${dto.studentUserId} at shift ${dto.shiftId}`,
    );
    return this.clinicalService.recordAttendance(dto, user);
  }

  @Patch(['clinical/attendance/:attendanceId', 'academy/clinical/attendance/:attendanceId'])
  @MessagePattern({ cmd: 'update_clinical_attendance' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateClinicalAttendanceSchema))
  async updateAttendance(
    @Param('attendanceId') paramAttendanceId?: string,
    @Body() body?: UpdateClinicalAttendanceDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      attendanceId: number;
      dto: UpdateClinicalAttendanceDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawAttendanceId = payload?.attendanceId !== undefined ? payload.attendanceId : paramAttendanceId;
    const attendanceId = Number(rawAttendanceId);
    if (!attendanceId || isNaN(attendanceId)) {
      throw new BadRequestException('Invalid attendance ID');
    }
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.clinicalService.updateAttendance(
      attendanceId,
      dto,
      user,
    );
  }

  @Get([
    'clinical/hours/student/:studentUserId/cohort/:cohortId',
    'academy/clinical/hours/student/:studentUserId/cohort/:cohortId',
  ])
  @MessagePattern({ cmd: 'get_student_clinical_hours' })
  @UsePipes(new JoiValidationPipe(StudentClinicalHoursSchema))
  async getStudentClinicalHours(
    @Param('studentUserId') paramStudentUserId?: string,
    @Param('cohortId') paramCohortId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      studentUserId: string;
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    const studentUserId = payload?.studentUserId || paramStudentUserId;
    const rawCohortId = payload?.cohortId !== undefined ? payload.cohortId : paramCohortId;
    const cohortId = Number(rawCohortId);
    if (!studentUserId || !cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Student user ID and valid cohort ID are required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.clinicalService.getStudentClinicalHours(
      studentUserId,
      cohortId,
      user,
    );
  }
}
