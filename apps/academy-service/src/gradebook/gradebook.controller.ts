import {
  Controller,
  UseGuards,
  UsePipes,
  Get,
  Param,
  Query,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GradebookService } from './gradebook.service';
import { GetStudentGradeReportDto, GetCohortGradebookDto } from './dto';
import {
  getStudentGradeReportSchema,
  getCohortGradebookSchema,
} from './gradebook.validation';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { AcademyRole } from '@prisma/client/academy';
import { AuthenticatedUser } from '../user/user.service';

@Controller()
@UseGuards(AcademyProfileGuard, RoleGuard)
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Get([
    'gradebook/student/:cohortId',
    'academy/gradebook/student/:cohortId',
  ])
  @MessagePattern('get_student_grade_report')
  @UsePipes(new JoiValidationPipe(getStudentGradeReportSchema))
  async getStudentGradeReport(
    @Param('cohortId') paramCohortId?: string,
    @Query('userId') queryUserId?: string,
    @Req() req?: any,
    @Payload() payload?: { dto: GetStudentGradeReportDto; user: AuthenticatedUser },
  ) {
    const rawCohortId = payload?.dto?.cohortId !== undefined ? payload.dto.cohortId : paramCohortId;
    const cohortId = Number(rawCohortId);
    if (!cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Valid cohort ID is required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const targetUserId = payload?.dto?.userId || queryUserId || user.firebaseId;
    return this.gradebookService.getStudentGradeReport(
      targetUserId,
      cohortId,
      user.firebaseId,
      user.role,
    );
  }

  @Get([
    'gradebook/cohort/:cohortId',
    'academy/gradebook/cohort/:cohortId',
  ])
  @MessagePattern('get_cohort_gradebook')
  @Roles(
    AcademyRole.INSTRUCTOR,
    AcademyRole.COURSE_MANAGER,
    AcademyRole.ADMIN,
    AcademyRole.COMMISSION_AUDITOR,
  )
  @UsePipes(new JoiValidationPipe(getCohortGradebookSchema))
  async getCohortGradebook(
    @Param('cohortId') paramCohortId?: string,
    @Req() req?: any,
    @Payload() payload?: { dto: GetCohortGradebookDto; user: AuthenticatedUser },
  ) {
    const rawCohortId = payload?.dto?.cohortId !== undefined ? payload.dto.cohortId : paramCohortId;
    const cohortId = Number(rawCohortId);
    if (!cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Valid cohort ID is required');
    }
    return this.gradebookService.getCohortGradebook(cohortId);
  }

  @Get([
    'gradebook/cohort/:cohortId/export-csv',
    'academy/gradebook/cohort/:cohortId/export-csv',
  ])
  @MessagePattern('export_cohort_gradebook_csv')
  @Roles(
    AcademyRole.INSTRUCTOR,
    AcademyRole.COURSE_MANAGER,
    AcademyRole.ADMIN,
    AcademyRole.COMMISSION_AUDITOR,
  )
  @UsePipes(new JoiValidationPipe(getCohortGradebookSchema))
  async exportCohortGradebookCsv(
    @Param('cohortId') paramCohortId?: string,
    @Req() req?: any,
    @Res({ passthrough: true }) res?: any,
    @Payload() payload?: { dto: GetCohortGradebookDto; user: AuthenticatedUser },
  ) {
    const rawCohortId = payload?.dto?.cohortId !== undefined ? payload.dto.cohortId : paramCohortId;
    const cohortId = Number(rawCohortId);
    if (!cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Valid cohort ID is required');
    }
    const csvData = await this.gradebookService.exportCohortGradebookCsv(cohortId);
    if (res && res.setHeader) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="cohort_${cohortId}_gradebook.csv"`,
      );
    }
    return {
      cohortId,
      csvContent: csvData,
      filename: `cohort_${cohortId}_gradebook.csv`,
    };
  }
}
