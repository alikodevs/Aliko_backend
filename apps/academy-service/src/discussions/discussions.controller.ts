import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DiscussionsService } from './discussions.service';
import {
  CreateDiscussionTopicDto,
  CreateDiscussionPostDto,
  GradeDiscussionPostDto,
} from './dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateTopicSchema,
  TopicIdSchema,
  ModuleIdDiscussionsSchema,
  CreatePostSchema,
  GradePostSchema,
} from './discussions.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class DiscussionsController {
  private readonly logger = new Logger(DiscussionsController.name);

  constructor(private readonly discussionsService: DiscussionsService) {}

  @MessagePattern({ cmd: 'create_discussion_topic' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateTopicSchema))
  async createTopic(
    @Payload()
    payload: {
      dto: CreateDiscussionTopicDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Creating discussion topic "${payload.dto.title}" for module ${payload.dto.moduleId} by user ${payload.user.firebaseId}`,
    );
    return this.discussionsService.createTopic(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'find_module_discussions' })
  @UsePipes(new JoiValidationPipe(ModuleIdDiscussionsSchema))
  async findAllByModule(
    @Payload()
    payload: {
      moduleId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.discussionsService.findAllByModule(
      payload.moduleId,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'get_discussion_topic' })
  @UsePipes(new JoiValidationPipe(TopicIdSchema))
  async getTopic(
    @Payload()
    payload: {
      topicId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.discussionsService.getTopicWithPosts(
      payload.topicId,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'create_discussion_post' })
  @UsePipes(new JoiValidationPipe(CreatePostSchema))
  async createPost(
    @Payload()
    payload: {
      dto: CreateDiscussionPostDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Posting to discussion topic ${payload.dto.topicId} by user ${payload.user.firebaseId}`,
    );
    return this.discussionsService.createPost(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'grade_discussion_post' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(GradePostSchema))
  async gradePost(
    @Payload()
    payload: {
      postId: number;
      dto: GradeDiscussionPostDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Grading discussion post ${payload.postId} by user ${payload.user.firebaseId}`,
    );
    return this.discussionsService.gradePost(
      payload.postId,
      payload.dto,
      payload.user,
    );
  }
}
