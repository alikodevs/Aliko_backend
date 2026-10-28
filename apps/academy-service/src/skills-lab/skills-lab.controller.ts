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

  @Post(['skills-lab/skills', 'academy/skills-lab/skills'])
  @MessagePattern({ cmd: 'create_core_skill' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateCoreSkillSchema))
  async createCoreSkill(
    @Body() body?: CreateCoreSkillDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: CreateCoreSkillDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Skill data is required');
    }
    this.logger.log(
      `Creating core skill "${dto.skillNumber}" by user ${user.firebaseId}`,
    );
    return this.skillsLabService.createCoreSkill(dto, user);
  }

  @Get(['skills-lab/skills', 'academy/skills-lab/skills'])
  @MessagePattern({ cmd: 'list_core_skills' })
  @UsePipes(new JoiValidationPipe(ListSkillsSchema))
  async listAllSkills(
    @Req() req?: any,
    @Payload()
    payload?: {
      user: AuthenticatedUser;
    },
  ) {
    return this.skillsLabService.listAllSkills();
  }

  @Get(['skills-lab/skills/:skillId', 'academy/skills-lab/skills/:skillId'])
  @MessagePattern({ cmd: 'get_core_skill' })
  @UsePipes(new JoiValidationPipe(SkillIdSchema))
  async getSkill(
    @Param('skillId') paramSkillId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      skillId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawSkillId = payload?.skillId !== undefined ? payload.skillId : paramSkillId;
    const skillId = Number(rawSkillId);
    if (!skillId || isNaN(skillId)) {
      throw new BadRequestException('Invalid skill ID');
    }
    return this.skillsLabService.getSkill(skillId);
  }

  @Post(['skills-lab/checkoffs', 'academy/skills-lab/checkoffs'])
  @MessagePattern({ cmd: 'record_skill_checkoff' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(RecordSkillCheckoffSchema))
  async recordCheckoff(
    @Body() body?: RecordSkillCheckoffDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: RecordSkillCheckoffDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Checkoff data is required');
    }
    this.logger.log(
      `Recording skill checkoff: skill=${dto.skillId} student=${dto.studentUserId} by instructor ${user.firebaseId}`,
    );
    return this.skillsLabService.recordCheckoff(dto, user);
  }

  @Patch(['skills-lab/checkoffs/:checkoffId', 'academy/skills-lab/checkoffs/:checkoffId'])
  @MessagePattern({ cmd: 'update_skill_checkoff' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateSkillCheckoffSchema))
  async updateCheckoff(
    @Param('checkoffId') paramCheckoffId?: string,
    @Body() body?: UpdateSkillCheckoffDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      checkoffId: number;
      dto: UpdateSkillCheckoffDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawCheckoffId = payload?.checkoffId !== undefined ? payload.checkoffId : paramCheckoffId;
    const checkoffId = Number(rawCheckoffId);
    if (!checkoffId || isNaN(checkoffId)) {
      throw new BadRequestException('Invalid checkoff ID');
    }
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.skillsLabService.updateCheckoff(checkoffId, dto, user);
  }

  @Get([
    'skills-lab/matrix/student/:studentUserId/cohort/:cohortId',
    'academy/skills-lab/matrix/student/:studentUserId/cohort/:cohortId',
  ])
  @MessagePattern({ cmd: 'get_student_skills_matrix' })
  @UsePipes(new JoiValidationPipe(StudentSkillsSchema))
  async getStudentSkillsMatrix(
    @Param('studentUserId') paramStudentUserId?: string,
    @Param('cohortId') paramCohortId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      studentUserId: string;
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    const studentUserId = payload?.studentUserId || paramStudentUserId;
    const rawCohortId = payload?.cohortId !== undefined ? payload.cohortId : paramCohortId;
    const cohortId = Number(rawCohortId);
    if (!studentUserId || !cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Student user ID and valid cohort ID are required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.skillsLabService.getStudentSkillsMatrix(
      studentUserId,
      cohortId,
      user,
    );
  }
}
