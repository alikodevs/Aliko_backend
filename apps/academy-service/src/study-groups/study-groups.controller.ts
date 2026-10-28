import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StudyGroupsService } from './study-groups.service';
import { CreateStudyGroupDto, JoinStudyGroupDto, UpdateStudyGroupDto } from './dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateStudyGroupSchema,
  JoinStudyGroupSchema,
  UpdateStudyGroupSchema,
  StudyGroupIdSchema,
  CohortStudyGroupsSchema,
} from './study-groups.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class StudyGroupsController {
  private readonly logger = new Logger(StudyGroupsController.name);

  constructor(private readonly studyGroupsService: StudyGroupsService) {}

  @Post(['study-groups', 'academy/study-groups'])
  @MessagePattern({ cmd: 'create_study_group' })
  @UsePipes(new JoiValidationPipe(CreateStudyGroupSchema))
  async create(
    @Body() body?: CreateStudyGroupDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: CreateStudyGroupDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Study group data is required');
    }
    this.logger.log(
      `Creating study group "${dto.name}" in cohort ${dto.cohortId} by user ${user.firebaseId}`,
    );
    return this.studyGroupsService.create(dto, user);
  }

  @Get(['study-groups/cohort/:cohortId', 'academy/study-groups/cohort/:cohortId'])
  @MessagePattern({ cmd: 'find_cohort_study_groups' })
  @UsePipes(new JoiValidationPipe(CohortStudyGroupsSchema))
  async findByCohort(
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
      throw new BadRequestException('Invalid cohort ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.studyGroupsService.findByCohort(cohortId, user);
  }

  @Get(['study-groups/:id', 'academy/study-groups/:id'])
  @MessagePattern({ cmd: 'get_study_group' })
  @UsePipes(new JoiValidationPipe(StudyGroupIdSchema))
  async findOne(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      studyGroupId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.studyGroupId !== undefined ? payload.studyGroupId : paramId;
    const studyGroupId = Number(rawId);
    if (!studyGroupId || isNaN(studyGroupId)) {
      throw new BadRequestException('Invalid study group ID');
    }
    return this.studyGroupsService.findOne(studyGroupId);
  }

  @Post(['study-groups/join', 'academy/study-groups/join'])
  @MessagePattern({ cmd: 'join_study_group' })
  @UsePipes(new JoiValidationPipe(JoinStudyGroupSchema))
  async join(
    @Body() body?: JoinStudyGroupDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: JoinStudyGroupDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Join data is required');
    }
    this.logger.log(
      `User ${user.firebaseId} joining study group ${dto.studyGroupId}`,
    );
    return this.studyGroupsService.join(dto, user);
  }

  @Post(['study-groups/:id/leave', 'academy/study-groups/:id/leave'])
  @MessagePattern({ cmd: 'leave_study_group' })
  @UsePipes(new JoiValidationPipe(StudyGroupIdSchema))
  async leave(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      studyGroupId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.studyGroupId !== undefined ? payload.studyGroupId : paramId;
    const studyGroupId = Number(rawId);
    if (!studyGroupId || isNaN(studyGroupId)) {
      throw new BadRequestException('Invalid study group ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `User ${user.firebaseId} leaving study group ${studyGroupId}`,
    );
    return this.studyGroupsService.leave(studyGroupId, user);
  }

  @Patch(['study-groups/:id', 'academy/study-groups/:id'])
  @MessagePattern({ cmd: 'update_study_group' })
  @UsePipes(new JoiValidationPipe(UpdateStudyGroupSchema))
  async update(
    @Param('id') paramId?: string,
    @Body() body?: UpdateStudyGroupDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      studyGroupId: number;
      dto: UpdateStudyGroupDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.studyGroupId !== undefined ? payload.studyGroupId : paramId;
    const studyGroupId = Number(rawId);
    if (!studyGroupId || isNaN(studyGroupId)) {
      throw new BadRequestException('Invalid study group ID');
    }
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Updating study group ${studyGroupId} by user ${user.firebaseId}`,
    );
    return this.studyGroupsService.update(
      studyGroupId,
      dto,
      user,
    );
  }

  @Delete(['study-groups/:id', 'academy/study-groups/:id'])
  @MessagePattern({ cmd: 'delete_study_group' })
  @UsePipes(new JoiValidationPipe(StudyGroupIdSchema))
  async remove(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      studyGroupId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.studyGroupId !== undefined ? payload.studyGroupId : paramId;
    const studyGroupId = Number(rawId);
    if (!studyGroupId || isNaN(studyGroupId)) {
      throw new BadRequestException('Invalid study group ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Deleting study group ${studyGroupId} by user ${user.firebaseId}`,
    );
    return this.studyGroupsService.remove(studyGroupId, user);
  }
}
