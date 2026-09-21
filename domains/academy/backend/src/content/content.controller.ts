import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { UploadContentDto } from './dto/upload-content.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { ContentType } from '../generated/client';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateContentSchema,
  UpdateContentSchema,
  ContentIdSchema,
  LessonIdContentSchema,
  FindContentQuerySchema,
  CourseIdContentSchema,
  UploadContentSchema,
  SearchContentSchema,
} from './content.validation';

interface UploadedFile {
  buffer: Buffer | string; // Buffer or base64 encoded string from transport
  originalname: string;
  mimetype: string;
  size: number;
}

@Controller()
@UseGuards(AcademyProfileGuard)
export class ContentController {
  private readonly logger = new Logger(ContentController.name);
  constructor(private readonly contentService: ContentService) {}

  @MessagePattern({ cmd: 'find_content_by_lesson' })
  @UsePipes(new JoiValidationPipe(LessonIdContentSchema))
  async findByLesson(
    @Payload()
    payload: {
      lessonId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    this.logger.log(
      `Fetching content for lesson ID: ${payload.lessonId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.contentService.findByLesson(
        payload.lessonId,
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch content for lesson ID ${payload.lessonId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'create_content' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateContentSchema))
  async create(
    @Payload() payload: { dto: CreateContentDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating content "${payload.dto.title}" for lesson ${payload.dto.lessonId} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.contentService.create(payload.dto, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to create content "${payload.dto.title}" for lesson ${payload.dto.lessonId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'upload_content_file' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UploadContentSchema))
  async uploadFile(
    @Payload()
    payload: {
      dto: UploadContentDto;
      file?: UploadedFile;
      user: AuthenticatedUser;
    },
  ) {
    const fileName = payload.file?.originalname || payload.dto?.contentUrl || 'N/A';
    this.logger.log(
      `Uploading content "${fileName}" for lesson ${payload.dto.lessonId} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.contentService.uploadFile(
        payload.dto,
        payload.file || null,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to upload content "${fileName}" for lesson ${payload.dto.lessonId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_all_content' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(FindContentQuerySchema))
  async findAll(@Payload() payload: { user: AuthenticatedUser; query?: any }) {
    this.logger.log(
      `Admin ${payload.user.firebaseId} fetching all content with query: ${JSON.stringify(payload.query)}`,
    );
    try {
      return await this.contentService.findAll(payload.user, payload.query);
    } catch (error) {
      this.logger.error(
        `Admin ${payload.user.firebaseId} failed to fetch all content: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_instructor_content' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(FindContentQuerySchema))
  async findInstructorContent(
    @Payload() payload: { user: AuthenticatedUser; query?: any },
  ) {
    this.logger.log(
      `Instructor ${payload.user.firebaseId} fetching their content`,
    );
    try {
      return await this.contentService.findByInstructor(
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${payload.user.firebaseId} failed to fetch their content: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_content_by_id' })
  @UsePipes(new JoiValidationPipe(ContentIdSchema))
  async findOne(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching content details for ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.contentService.findOne(payload);
    } catch (error) {
      this.logger.error(
        `Failed to fetch content details for ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_content' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateContentSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      dto: UpdateContentDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating content ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.contentService.update(payload);
    } catch (error) {
      this.logger.error(
        `Failed to update content ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'remove_content' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ContentIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing content ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.contentService.remove(payload);
    } catch (error) {
      this.logger.error(
        `Failed to remove content ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_content_by_course' })
  @UsePipes(new JoiValidationPipe(CourseIdContentSchema))
  async findByCourse(
    @Payload() payload: { courseId: number; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Fetching all content for course ID: ${payload.courseId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.contentService.findByCourse(payload);
    } catch (error) {
      this.logger.error(
        `Failed to fetch content for course ID ${payload.courseId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'search_content' })
  @UsePipes(new JoiValidationPipe(SearchContentSchema))
  async searchContent(
    @Payload()
    payload: {
      query: string;
      type?: string;
      courseId?: number;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Searching content with query: "${payload.query}" (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.contentService.searchContent(payload as any);
    } catch (error) {
      this.logger.error(
        `Failed to search content with query "${payload.query}" by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
