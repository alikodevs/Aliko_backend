import { Controller, UseGuards, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EvaluationsService } from './evaluations.service';
import { SubmitSurveyDto, GetCohortSurveysDto } from './dto';
import { submitSurveySchema, getCohortSurveysSchema } from './evaluations.validation';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { AcademyRole } from '@prisma/client/academy';
import { AuthenticatedUser } from '../user/user.service';

@Controller()
@UseGuards(AcademyProfileGuard, RoleGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @MessagePattern('submit_evaluation_survey')
  @UsePipes(new JoiValidationPipe(submitSurveySchema))
  async submitSurvey(
    @Payload() payload: { dto: SubmitSurveyDto; user: AuthenticatedUser },
  ) {
    return this.evaluationsService.submitSurvey(payload.user.firebaseId, payload.dto);
  }

  @MessagePattern('get_my_evaluation_survey')
  async getMySurvey(
    @Payload() payload: { cohortId: number; user: AuthenticatedUser },
  ) {
    return this.evaluationsService.getMySurvey(payload.user.firebaseId, payload.cohortId);
  }

  @MessagePattern('get_cohort_evaluation_surveys')
  @Roles(
    AcademyRole.INSTRUCTOR,
    AcademyRole.COURSE_MANAGER,
    AcademyRole.ADMIN,
    AcademyRole.COMMISSION_AUDITOR,
  )
  @UsePipes(new JoiValidationPipe(getCohortSurveysSchema))
  async getCohortSurveys(
    @Payload() payload: { dto: GetCohortSurveysDto; user: AuthenticatedUser },
  ) {
    return this.evaluationsService.getCohortSurveys(payload.dto);
  }
}
