import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SkillsLabService } from './skills-lab.service';
import { CreateCoreSkillDto, RecordSkillCheckoffDto, UpdateSkillCheckoffDto } from './dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateCoreSkillSchema,
  RecordSkillCheckoffSchema,
  UpdateSkillCheckoffSchema,
  SkillIdSchema,
  StudentSkillsSchema,
  ListSkillsSchema,
} from './skills-lab.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class SkillsLabController {
  private readonly logger = new Logger(SkillsLabController.name);

  constructor(private readonly skillsLabService: SkillsLabService) {}

  @MessagePattern({ cmd: 'create_core_skill' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateCoreSkillSchema))
  async createCoreSkill(
    @Payload()
    payload: {
      dto: CreateCoreSkillDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Creating core skill "${payload.dto.skillNumber}" by user ${payload.user.firebaseId}`,
    );
    return this.skillsLabService.createCoreSkill(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'list_core_skills' })
  @UsePipes(new JoiValidationPipe(ListSkillsSchema))
  async listAllSkills(
    @Payload()
    payload: {
      user: AuthenticatedUser;
    },
  ) {
    return this.skillsLabService.listAllSkills();
  }

  @MessagePattern({ cmd: 'get_core_skill' })
  @UsePipes(new JoiValidationPipe(SkillIdSchema))
  async getSkill(
    @Payload()
    payload: {
      skillId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.skillsLabService.getSkill(payload.skillId);
  }

  @MessagePattern({ cmd: 'record_skill_checkoff' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(RecordSkillCheckoffSchema))
  async recordCheckoff(
    @Payload()
    payload: {
      dto: RecordSkillCheckoffDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Recording skill checkoff: skill=${payload.dto.skillId} student=${payload.dto.studentUserId} by instructor ${payload.user.firebaseId}`,
    );
    return this.skillsLabService.recordCheckoff(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'update_skill_checkoff' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateSkillCheckoffSchema))
  async updateCheckoff(
    @Payload()
    payload: {
      checkoffId: number;
      dto: UpdateSkillCheckoffDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.skillsLabService.updateCheckoff(
      payload.checkoffId,
      payload.dto,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'get_student_skills_matrix' })
  @UsePipes(new JoiValidationPipe(StudentSkillsSchema))
  async getStudentSkillsMatrix(
    @Payload()
    payload: {
      studentUserId: string;
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.skillsLabService.getStudentSkillsMatrix(
      payload.studentUserId,
      payload.cohortId,
      payload.user,
    );
  }
}
