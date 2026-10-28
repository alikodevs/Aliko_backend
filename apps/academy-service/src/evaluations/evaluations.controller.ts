import {
  Controller,
  UseGuards,
  UsePipes,
  Get,
  Post,
  Param,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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

  @Post(['evaluations/surveys', 'academy/evaluations/surveys'])
  @MessagePattern('submit_evaluation_survey')
  @UsePipes(new JoiValidationPipe(submitSurveySchema))
  async submitSurvey(
    @Body() body?: SubmitSurveyDto,
    @Req() req?: any,
    @Payload() payload?: { dto: SubmitSurveyDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Survey data is required');
    }
    return this.evaluationsService.submitSurvey(user.firebaseId, dto);
  }

  @Get([
    'evaluations/my-survey/:cohortId',
    'academy/evaluations/my-survey/:cohortId',
  ])
  @MessagePattern('get_my_evaluation_survey')
  async getMySurvey(
    @Param('cohortId') paramCohortId?: string,
    @Req() req?: any,
    @Payload() payload?: { cohortId: number; user: AuthenticatedUser },
  ) {
    const rawCohortId = payload?.cohortId !== undefined ? payload.cohortId : paramCohortId;
    const cohortId = Number(rawCohortId);
    if (!cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Valid cohort ID is required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.evaluationsService.getMySurvey(user.firebaseId, cohortId);
  }

  @Get([
    'evaluations/cohort/:cohortId',
    'academy/evaluations/cohort/:cohortId',
  ])
  @MessagePattern('get_cohort_evaluation_surveys')
  @Roles(
    AcademyRole.INSTRUCTOR,
    AcademyRole.COURSE_MANAGER,
    AcademyRole.ADMIN,
    AcademyRole.COMMISSION_AUDITOR,
  )
  @UsePipes(new JoiValidationPipe(getCohortSurveysSchema))
  async getCohortSurveys(
    @Param('cohortId') paramCohortId?: string,
    @Req() req?: any,
    @Payload() payload?: { dto: GetCohortSurveysDto; user: AuthenticatedUser },
  ) {
    const rawCohortId = payload?.dto?.cohortId !== undefined ? payload.dto.cohortId : paramCohortId;
    const cohortId = Number(rawCohortId);
    if (!cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Valid cohort ID is required');
    }
    return this.evaluationsService.getCohortSurveys({ cohortId });
  }
}
