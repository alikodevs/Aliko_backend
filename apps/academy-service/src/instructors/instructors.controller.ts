import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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

  @Post(['instructors/credentials', 'academy/instructors/credentials'])
  @MessagePattern({ cmd: 'register_instructor_credential' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(RegisterCredentialSchema))
  async registerCredential(
    @Body() body?: RegisterInstructorCredentialDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: RegisterInstructorCredentialDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Credential data required');
    }
    this.logger.log(
      `Registering instructor credentials for ${user.firebaseId}`,
    );
    return this.instructorsService.registerCredential(dto, user);
  }

  @Put(['instructors/credentials', 'academy/instructors/credentials'])
  @MessagePattern({ cmd: 'update_instructor_credential' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateCredentialSchema))
  async updateCredential(
    @Body() body?: UpdateInstructorCredentialDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: UpdateInstructorCredentialDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Credential update data required');
    }
    return this.instructorsService.updateCredential(dto, user);
  }

  @Get([
    'instructors/credentials/:instructorUserId',
    'academy/instructors/credentials/:instructorUserId',
  ])
  @MessagePattern({ cmd: 'get_instructor_credential' })
  @UsePipes(new JoiValidationPipe(InstructorUserIdSchema))
  async getCredential(
    @Param('instructorUserId') paramInstructorUserId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      instructorUserId: string;
      user: AuthenticatedUser;
    },
  ) {
    const instructorUserId = payload?.instructorUserId || paramInstructorUserId;
    if (!instructorUserId) {
      throw new BadRequestException('Instructor user ID required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.instructorsService.getCredential(
      instructorUserId,
      user,
    );
  }

  @Post(['instructors/approve', 'academy/instructors/approve'])
  @MessagePattern({ cmd: 'approve_instructor' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(ApproveInstructorSchema))
  async approveInstructor(
    @Body() body?: ApproveInstructorDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: ApproveInstructorDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Approval data required');
    }
    this.logger.log(
      `Director ${user.firebaseId} approving instructor ${dto.instructorUserId}`,
    );
    return this.instructorsService.approveInstructor(dto, user);
  }

  @Get(['instructors/all', 'academy/instructors/all'])
  @MessagePattern({ cmd: 'list_all_instructors' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'COMMISSION_AUDITOR')
  @UsePipes(new JoiValidationPipe(ListInstructorsSchema))
  async listAllInstructors(
    @Req() req?: any,
    @Payload()
    payload?: {
      user: AuthenticatedUser;
    },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.instructorsService.listAllInstructors(user);
  }
}
