import { Controller, UsePipes, UseFilters, Logger, HttpStatus } from "@nestjs/common";
import { MessagePattern, Payload, RpcException } from "@nestjs/microservices";
import { StoriesService } from "./stories.service";
import {
  CreateStoryChapterDto,
  UpdateStoryChapterDto,
} from "./dto/story-chapter.dto";
import { JoiValidationPipe } from "../common/pipes/joi-validation.pipe";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import {
  CreateStoryChapterSchema,
  UpdateStoryChapterSchema,
  StoryChapterIdSchema,
} from "./stories.validation";

@Controller()
@UseFilters(RpcExceptionFilter)
export class StoriesController {
  private readonly logger = new Logger(StoriesController.name);

  constructor(private readonly storiesService: StoriesService) {}

  @MessagePattern({ cmd: "alikowash_create_story" })
  @UsePipes(new JoiValidationPipe(CreateStoryChapterSchema))
  async create(@Payload() payload: CreateStoryChapterDto & { user: any }) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can create story chapters",
        error: "Forbidden",
      });
    }
    const { user, ...dto } = payload;
    return await this.storiesService.create(dto as CreateStoryChapterDto);
  }

  @MessagePattern({ cmd: "alikowash_find_all_stories" })
  async findAll(@Payload() query: any) {
    return await this.storiesService.findAll(query);
  }

  @MessagePattern({ cmd: "alikowash_find_story_by_id" })
  @UsePipes(new JoiValidationPipe(StoryChapterIdSchema))
  async findOne(@Payload() payload: { id: string }) {
    return await this.storiesService.findOne(payload.id);
  }

  @MessagePattern({ cmd: "alikowash_update_story" })
  @UsePipes(new JoiValidationPipe(UpdateStoryChapterSchema))
  async update(
    @Payload() payload: { id: string; dto: UpdateStoryChapterDto; user: any },
  ) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can update story chapters",
        error: "Forbidden",
      });
    }
    return await this.storiesService.update(payload.id, payload.dto);
  }

  @MessagePattern({ cmd: "alikowash_remove_story" })
  @UsePipes(new JoiValidationPipe(StoryChapterIdSchema))
  async remove(@Payload() payload: { id: string; user: any }) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can delete story chapters",
        error: "Forbidden",
      });
    }
    return await this.storiesService.remove(payload.id);
  }
}
