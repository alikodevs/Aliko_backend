import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InstructorsService } from './instructors.service';
import {
  RegisterInstructorCredentialDto,
  UpdateInstructorCredentialDto,
  ApproveInstructorDto,
} from './dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  RegisterCredentialSchema,
  UpdateCredentialSchema,
  ApproveInstructorSchema,
  InstructorUserIdSchema,
  ListInstructorsSchema,
} from './instructors.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class InstructorsController {
  private readonly logger = new Logger(InstructorsController.name);

  constructor(private readonly instructorsService: InstructorsService) {}

  @MessagePattern({ cmd: 'register_instructor_credential' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(RegisterCredentialSchema))
  async registerCredential(
    @Payload()
    payload: {
      dto: RegisterInstructorCredentialDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Registering instructor credentials for ${payload.user.firebaseId}`,
    );
    return this.instructorsService.registerCredential(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'update_instructor_credential' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateCredentialSchema))
  async updateCredential(
    @Payload()
    payload: {
      dto: UpdateInstructorCredentialDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.instructorsService.updateCredential(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'get_instructor_credential' })
  @UsePipes(new JoiValidationPipe(InstructorUserIdSchema))
  async getCredential(
    @Payload()
    payload: {
      instructorUserId: string;
      user: AuthenticatedUser;
    },
  ) {
    return this.instructorsService.getCredential(
      payload.instructorUserId,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'approve_instructor' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(ApproveInstructorSchema))
  async approveInstructor(
    @Payload()
    payload: {
      dto: ApproveInstructorDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Director ${payload.user.firebaseId} approving instructor ${payload.dto.instructorUserId}`,
    );
    return this.instructorsService.approveInstructor(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'list_all_instructors' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'COMMISSION_AUDITOR')
  @UsePipes(new JoiValidationPipe(ListInstructorsSchema))
  async listAllInstructors(
    @Payload()
    payload: {
      user: AuthenticatedUser;
    },
  ) {
    return this.instructorsService.listAllInstructors(payload.user);
  }
}
