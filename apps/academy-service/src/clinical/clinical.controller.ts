import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
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

  @MessagePattern({ cmd: 'create_clinical_shift' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateClinicalShiftSchema))
  async createShift(
    @Payload()
    payload: {
      dto: CreateClinicalShiftDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Creating clinical shift at "${payload.dto.facilityName}" by instructor ${payload.user.firebaseId}`,
    );
    return this.clinicalService.createShift(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'find_cohort_clinical_shifts' })
  @UsePipes(new JoiValidationPipe(CohortClinicalSchema))
  async findByCohort(
    @Payload()
    payload: {
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.clinicalService.findByCohort(payload.cohortId, payload.user);
  }

  @MessagePattern({ cmd: 'get_clinical_shift' })
  @UsePipes(new JoiValidationPipe(ShiftIdSchema))
  async getShift(
    @Payload()
    payload: {
      shiftId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.clinicalService.getShift(payload.shiftId);
  }

  @MessagePattern({ cmd: 'record_clinical_attendance' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(RecordClinicalAttendanceSchema))
  async recordAttendance(
    @Payload()
    payload: {
      dto: RecordClinicalAttendanceDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Recording clinical attendance: student ${payload.dto.studentUserId} at shift ${payload.dto.shiftId}`,
    );
    return this.clinicalService.recordAttendance(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'update_clinical_attendance' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateClinicalAttendanceSchema))
  async updateAttendance(
    @Payload()
    payload: {
      attendanceId: number;
      dto: UpdateClinicalAttendanceDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.clinicalService.updateAttendance(
      payload.attendanceId,
      payload.dto,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'get_student_clinical_hours' })
  @UsePipes(new JoiValidationPipe(StudentClinicalHoursSchema))
  async getStudentClinicalHours(
    @Payload()
    payload: {
      studentUserId: string;
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.clinicalService.getStudentClinicalHours(
      payload.studentUserId,
      payload.cohortId,
      payload.user,
    );
  }
}
