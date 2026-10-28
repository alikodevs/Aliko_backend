import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Param,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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

  @Post(['discussions/topics', 'academy/discussions/topics'])
  @MessagePattern({ cmd: 'create_discussion_topic' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateTopicSchema))
  async createTopic(
    @Body() body?: CreateDiscussionTopicDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: CreateDiscussionTopicDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Topic data is required');
    }
    this.logger.log(
      `Creating discussion topic "${dto.title}" for module ${dto.moduleId} by user ${user.firebaseId}`,
    );
    return this.discussionsService.createTopic(dto, user);
  }

  @Get(['discussions/modules/:moduleId', 'academy/discussions/modules/:moduleId'])
  @MessagePattern({ cmd: 'find_module_discussions' })
  @UsePipes(new JoiValidationPipe(ModuleIdDiscussionsSchema))
  async findAllByModule(
    @Param('moduleId') paramModuleId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      moduleId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawModuleId = payload?.moduleId !== undefined ? payload.moduleId : paramModuleId;
    const moduleId = Number(rawModuleId);
    if (!moduleId || isNaN(moduleId)) {
      throw new BadRequestException('Invalid module ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.discussionsService.findAllByModule(moduleId, user);
  }

  @Get(['discussions/topics/:topicId', 'academy/discussions/topics/:topicId'])
  @MessagePattern({ cmd: 'get_discussion_topic' })
  @UsePipes(new JoiValidationPipe(TopicIdSchema))
  async getTopic(
    @Param('topicId') paramTopicId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      topicId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawTopicId = payload?.topicId !== undefined ? payload.topicId : paramTopicId;
    const topicId = Number(rawTopicId);
    if (!topicId || isNaN(topicId)) {
      throw new BadRequestException('Invalid topic ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.discussionsService.getTopicWithPosts(topicId, user);
  }

  @Post(['discussions/posts', 'academy/discussions/posts'])
  @MessagePattern({ cmd: 'create_discussion_post' })
  @UsePipes(new JoiValidationPipe(CreatePostSchema))
  async createPost(
    @Body() body?: CreateDiscussionPostDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: CreateDiscussionPostDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Post data is required');
    }
    this.logger.log(
      `Posting to discussion topic ${dto.topicId} by user ${user.firebaseId}`,
    );
    return this.discussionsService.createPost(dto, user);
  }

  @Post(['discussions/posts/:postId/grade', 'academy/discussions/posts/:postId/grade'])
  @MessagePattern({ cmd: 'grade_discussion_post' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(GradePostSchema))
  async gradePost(
    @Param('postId') paramPostId?: string,
    @Body() body?: GradeDiscussionPostDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      postId: number;
      dto: GradeDiscussionPostDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawPostId = payload?.postId !== undefined ? payload.postId : paramPostId;
    const postId = Number(rawPostId);
    if (!postId || isNaN(postId)) {
      throw new BadRequestException('Invalid post ID');
    }
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Grade data is required');
    }
    this.logger.log(
      `Grading discussion post ${postId} by user ${user.firebaseId}`,
    );
    return this.discussionsService.gradePost(postId, dto, user);
  }
}
