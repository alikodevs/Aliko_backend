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
import { AdmissionsService } from './admissions.service';
import {
  SubmitAdmissionsApplicationDto,
  SignEnrollmentAgreementDto,
  ReviewAdmissionsApplicationDto,
} from './dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  SubmitApplicationSchema,
  SignAgreementSchema,
  ReviewApplicationSchema,
  CohortAdmissionsSchema,
  UserOnlyAdmissionsSchema,
} from './admissions.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class AdmissionsController {
  private readonly logger = new Logger(AdmissionsController.name);

  constructor(private readonly admissionsService: AdmissionsService) {}

  @Post(['admissions/submit', 'academy/admissions/submit'])
  @MessagePattern({ cmd: 'submit_admissions_application' })
  @UsePipes(new JoiValidationPipe(SubmitApplicationSchema))
  async submitApplication(
    @Body() body?: SubmitAdmissionsApplicationDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: SubmitAdmissionsApplicationDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Application data required');
    }
    return this.admissionsService.submitApplication(dto, user);
  }

  @Post(['admissions/sign-agreement', 'academy/admissions/sign-agreement'])
  @MessagePattern({ cmd: 'sign_enrollment_agreement' })
  @UsePipes(new JoiValidationPipe(SignAgreementSchema))
  async signAgreement(
    @Body() body?: SignEnrollmentAgreementDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: SignEnrollmentAgreementDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Agreement data required');
    }
    return this.admissionsService.signEnrollmentAgreement(
      dto,
      user,
    );
  }

  @Patch(['admissions/review', 'academy/admissions/review'])
  @MessagePattern({ cmd: 'review_admissions_application' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ReviewApplicationSchema))
  async reviewApplication(
    @Body() body?: ReviewAdmissionsApplicationDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: ReviewAdmissionsApplicationDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Review data required');
    }
    return this.admissionsService.reviewApplication(dto, user);
  }

  @Get(['admissions/my-application/:cohortId', 'academy/admissions/my-application/:cohortId'])
  @MessagePattern({ cmd: 'get_my_admissions_application' })
  @UsePipes(new JoiValidationPipe(UserOnlyAdmissionsSchema))
  async getMyApplication(
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
      throw new BadRequestException('Valid cohort ID required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.admissionsService.getMyApplication(
      cohortId,
      user,
    );
  }

  @Get(['admissions/cohort/:cohortId', 'academy/admissions/cohort/:cohortId'])
  @MessagePattern({ cmd: 'get_cohort_admissions_applications' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR')
  @UsePipes(new JoiValidationPipe(CohortAdmissionsSchema))
  async getCohortApplications(
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
      throw new BadRequestException('Valid cohort ID required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.admissionsService.getCohortApplications(
      cohortId,
      user,
    );
  }
}
