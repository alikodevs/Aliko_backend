import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
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

  @MessagePattern({ cmd: 'create_study_group' })
  @UsePipes(new JoiValidationPipe(CreateStudyGroupSchema))
  async create(
    @Payload()
    payload: {
      dto: CreateStudyGroupDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Creating study group "${payload.dto.name}" in cohort ${payload.dto.cohortId} by user ${payload.user.firebaseId}`,
    );
    return this.studyGroupsService.create(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'find_cohort_study_groups' })
  @UsePipes(new JoiValidationPipe(CohortStudyGroupsSchema))
  async findByCohort(
    @Payload()
    payload: {
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.studyGroupsService.findByCohort(payload.cohortId, payload.user);
  }

  @MessagePattern({ cmd: 'get_study_group' })
  @UsePipes(new JoiValidationPipe(StudyGroupIdSchema))
  async findOne(
    @Payload()
    payload: {
      studyGroupId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.studyGroupsService.findOne(payload.studyGroupId);
  }

  @MessagePattern({ cmd: 'join_study_group' })
  @UsePipes(new JoiValidationPipe(JoinStudyGroupSchema))
  async join(
    @Payload()
    payload: {
      dto: JoinStudyGroupDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `User ${payload.user.firebaseId} joining study group ${payload.dto.studyGroupId}`,
    );
    return this.studyGroupsService.join(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'leave_study_group' })
  @UsePipes(new JoiValidationPipe(StudyGroupIdSchema))
  async leave(
    @Payload()
    payload: {
      studyGroupId: number;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `User ${payload.user.firebaseId} leaving study group ${payload.studyGroupId}`,
    );
    return this.studyGroupsService.leave(payload.studyGroupId, payload.user);
  }

  @MessagePattern({ cmd: 'update_study_group' })
  @UsePipes(new JoiValidationPipe(UpdateStudyGroupSchema))
  async update(
    @Payload()
    payload: {
      studyGroupId: number;
      dto: UpdateStudyGroupDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating study group ${payload.studyGroupId} by user ${payload.user.firebaseId}`,
    );
    return this.studyGroupsService.update(
      payload.studyGroupId,
      payload.dto,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'delete_study_group' })
  @UsePipes(new JoiValidationPipe(StudyGroupIdSchema))
  async remove(
    @Payload()
    payload: {
      studyGroupId: number;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Deleting study group ${payload.studyGroupId} by user ${payload.user.firebaseId}`,
    );
    return this.studyGroupsService.remove(payload.studyGroupId, payload.user);
  }
}
