import { Controller, UseGuards, UsePipes } from '@nestjs/common';
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

  @MessagePattern('get_student_grade_report')
  @UsePipes(new JoiValidationPipe(getStudentGradeReportSchema))
  async getStudentGradeReport(
    @Payload() payload: { dto: GetStudentGradeReportDto; user: AuthenticatedUser },
  ) {
    const targetUserId = payload.dto.userId || payload.user.firebaseId;
    return this.gradebookService.getStudentGradeReport(
      targetUserId,
      payload.dto.cohortId,
      payload.user.firebaseId,
      payload.user.role,
    );
  }

  @MessagePattern('get_cohort_gradebook')
  @Roles(
    AcademyRole.INSTRUCTOR,
    AcademyRole.COURSE_MANAGER,
    AcademyRole.ADMIN,
    AcademyRole.COMMISSION_AUDITOR,
  )
  @UsePipes(new JoiValidationPipe(getCohortGradebookSchema))
  async getCohortGradebook(
    @Payload() payload: { dto: GetCohortGradebookDto; user: AuthenticatedUser },
  ) {
    return this.gradebookService.getCohortGradebook(payload.dto.cohortId);
  }

  @MessagePattern('export_cohort_gradebook_csv')
  @Roles(
    AcademyRole.INSTRUCTOR,
    AcademyRole.COURSE_MANAGER,
    AcademyRole.ADMIN,
    AcademyRole.COMMISSION_AUDITOR,
  )
  @UsePipes(new JoiValidationPipe(getCohortGradebookSchema))
  async exportCohortGradebookCsv(
    @Payload() payload: { dto: GetCohortGradebookDto; user: AuthenticatedUser },
  ) {
    const csvData = await this.gradebookService.exportCohortGradebookCsv(payload.dto.cohortId);
    return {
      cohortId: payload.dto.cohortId,
      csvContent: csvData,
      filename: `cohort_${payload.dto.cohortId}_gradebook.csv`,
    };
  }
}
