import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
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

  @MessagePattern({ cmd: 'submit_admissions_application' })
  @UsePipes(new JoiValidationPipe(SubmitApplicationSchema))
  async submitApplication(
    @Payload()
    payload: {
      dto: SubmitAdmissionsApplicationDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.admissionsService.submitApplication(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'sign_enrollment_agreement' })
  @UsePipes(new JoiValidationPipe(SignAgreementSchema))
  async signAgreement(
    @Payload()
    payload: {
      dto: SignEnrollmentAgreementDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.admissionsService.signEnrollmentAgreement(
      payload.dto,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'review_admissions_application' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ReviewApplicationSchema))
  async reviewApplication(
    @Payload()
    payload: {
      dto: ReviewAdmissionsApplicationDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.admissionsService.reviewApplication(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'get_my_admissions_application' })
  @UsePipes(new JoiValidationPipe(UserOnlyAdmissionsSchema))
  async getMyApplication(
    @Payload()
    payload: {
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.admissionsService.getMyApplication(
      payload.cohortId,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'get_cohort_admissions_applications' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR')
  @UsePipes(new JoiValidationPipe(CohortAdmissionsSchema))
  async getCohortApplications(
    @Payload()
    payload: {
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.admissionsService.getCohortApplications(
      payload.cohortId,
      payload.user,
    );
  }
}
