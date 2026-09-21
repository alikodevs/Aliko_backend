import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  UseFilters,
} from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { PostStatus, PostType } from "../generated/client";
import { AuthenticatedUser } from "../user/user.service";
import { EventsProfileGuard } from "../auth/events-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import {
  CreatePostSchema,
  UpdatePostSchema,
  PostIdSchema,
  FindAllPostsSchema,
  ReviewPostSchema,
  UserOnlySchema,
} from "./posts.validation";

@Controller()
@UseGuards(EventsProfileGuard)
@UseFilters(RpcExceptionFilter)
export class PostsController {
  private readonly logger = new Logger(PostsController.name);
  constructor(private readonly postsService: PostsService) {}

  @MessagePattern({ cmd: "create_post" })
  @UsePipes(new JoiValidationPipe(CreatePostSchema))
  async create(
    @Payload() payload: { dto: CreatePostDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating post "${payload.dto.title}" by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.postsService.create(payload.dto, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to create post "${payload.dto.title}" for user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "find_all_posts" })
  @UsePipes(new JoiValidationPipe(FindAllPostsSchema))
  async findAll(
    @Payload()
    payload: {
      type?: PostType;
      status?: PostStatus;
      page?: number;
      limit?: number;
      public?: boolean;
      user?: AuthenticatedUser;
    },
  ) {
    this.logger.log(`Fetching all posts with query: ${JSON.stringify(payload)}`);
    try {
      return await this.postsService.findAll(payload);
    } catch (error) {
      this.logger.error(
        `Failed to fetch posts with query ${JSON.stringify(payload)}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "find_one_post" })
  @UsePipes(new JoiValidationPipe(PostIdSchema))
  async findOne(
    @Payload()
    payload: {
      id: string;
      public?: boolean;
      user?: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Fetching details for post ID: ${payload.id} (Public: ${payload.public || false})`,
    );
    try {
      return await this.postsService.findOne(payload.id, payload.public);
    } catch (error) {
      this.logger.error(
        `Failed to fetch post details for ID ${payload.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "update_post" })
  @UsePipes(new JoiValidationPipe(UpdatePostSchema))
  async update(
    @Payload()
    payload: {
      id: string;
      dto: UpdatePostDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating post ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.postsService.update(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update post ID ${payload.id} for user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "submit_post_for_review" })
  @UsePipes(new JoiValidationPipe(PostIdSchema))
  async submitForReview(
    @Payload() payload: { id: string; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Submitting post ID: ${payload.id} for review by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.postsService.submitForReview(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to submit post ID ${payload.id} for review (By user: ${payload.user.firebaseId}): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "review_post" })
  @UsePipes(new JoiValidationPipe(ReviewPostSchema))
  async review(
    @Payload()
    payload: {
      id: string;
      status: PostStatus;
      rejectionReason?: string;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Reviewing post ID: ${payload.id} with status ${payload.status} by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.postsService.review(
        payload.id,
        payload.status,
        payload.rejectionReason || null,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to review post ID ${payload.id} by admin ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "remove_post" })
  @UsePipes(new JoiValidationPipe(PostIdSchema))
  async remove(@Payload() payload: { id: string; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing post ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.postsService.remove(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to remove post ID ${payload.id} for user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "get_stats" })
  @UsePipes(new JoiValidationPipe(UserOnlySchema))
  async getStats(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(`Fetching stats for user: ${payload.user.firebaseId}`);
    return this.postsService.getStats(payload.user);
  }

  @MessagePattern({ cmd: "get_event_stats" })
  @UsePipes(new JoiValidationPipe(PostIdSchema))
  async getEventStats(
    @Payload() payload: { id: string; user: AuthenticatedUser },
  ) {
    this.logger.log(`Fetching stats for event ID: ${payload.id}`);
    return this.postsService.getEventStats(payload.id, payload.user);
  }

  @MessagePattern({ cmd: "get_landing_info" })
  async getLandingInfo() {
    this.logger.log("Fetching landing info");
    return this.postsService.getLandingInfo();
  }
}
