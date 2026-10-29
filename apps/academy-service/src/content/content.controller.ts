import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { UploadContentDto } from './dto/upload-content.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { ContentType } from '@prisma/client/academy';
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

  @Get(['content/lesson/:lessonId', 'academy/content/lesson/:lessonId'])
  @MessagePattern({ cmd: 'find_content_by_lesson' })
  @UsePipes(new JoiValidationPipe(LessonIdContentSchema))
  async findByLesson(
    @Param('lessonId') paramLessonId?: string,
    @Query() query?: any,
    @Req() req?: any,
    @Payload()
    payload?: {
      lessonId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    const rawLessonId = payload?.lessonId !== undefined ? payload.lessonId : paramLessonId;
    const lessonId = Number(rawLessonId);
    if (!lessonId || isNaN(lessonId)) {
      throw new BadRequestException('Invalid lesson ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query;

    this.logger.log(
      `Fetching content for lesson ID: ${lessonId} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.contentService.findByLesson(lessonId, user, q);
    } catch (error) {
      this.logger.error(
        `Failed to fetch content for lesson ID ${lessonId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(['content', 'academy/content'])
  @MessagePattern({ cmd: 'create_content' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateContentSchema))
  async create(
    @Body() body?: CreateContentDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CreateContentDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Content data is required');
    }

    this.logger.log(
      `Creating content "${dto.title}" for lesson ${dto.lessonId} by user: ${user.firebaseId}`,
    );
    try {
      return await this.contentService.create(dto, user);
    } catch (error) {
      this.logger.error(
        `Failed to create content "${dto.title}" for lesson ${dto.lessonId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(['content/upload', 'academy/content/upload'])
  @MessagePattern({ cmd: 'upload_content_file' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UploadContentSchema))
  async uploadFile(
    @Body() body?: UploadContentDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: UploadContentDto;
      file?: UploadedFile;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Content upload data required');
    }
    const file = payload?.file || req?.file;
    const fileName = file?.originalname || dto?.contentUrl || 'N/A';
    this.logger.log(
      `Uploading content "${fileName}" for lesson ${dto.lessonId} by user: ${user.firebaseId}`,
    );
    try {
      return await this.contentService.uploadFile(
        dto,
        file || null,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to upload content "${fileName}" for lesson ${dto.lessonId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['content', 'academy/content'])
  @MessagePattern({ cmd: 'find_all_content' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(FindContentQuerySchema))
  async findAll(
    @Query() query?: any,
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser; query?: any },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query;

    this.logger.log(
      `Admin ${user.firebaseId} fetching all content with query: ${JSON.stringify(q)}`,
    );
    try {
      return await this.contentService.findAll(user, q);
    } catch (error) {
      this.logger.error(
        `Admin ${user.firebaseId} failed to fetch all content: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['content/instructor', 'academy/content/instructor'])
  @MessagePattern({ cmd: 'find_instructor_content' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(FindContentQuerySchema))
  async findInstructorContent(
    @Query() query?: any,
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser; query?: any },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query;

    this.logger.log(
      `Instructor ${user.firebaseId} fetching their content`,
    );
    try {
      return await this.contentService.findByInstructor(user, q);
    } catch (error) {
      this.logger.error(
        `Instructor ${user.firebaseId} failed to fetch their content: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['content/:id', 'academy/content/:id'])
  @MessagePattern({ cmd: 'find_content_by_id' })
  @UsePipes(new JoiValidationPipe(ContentIdSchema))
  async findOne(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid content ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    this.logger.log(
      `Fetching content details for ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.contentService.findOne({ id, user });
    } catch (error) {
      this.logger.error(
        `Failed to fetch content details for ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Patch(['content/:id', 'academy/content/:id'])
  @Put(['content/:id', 'academy/content/:id'])
  @MessagePattern({ cmd: 'update_content' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateContentSchema))
  async update(
    @Param('id') paramId?: string,
    @Body() body?: UpdateContentDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      dto: UpdateContentDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid content ID');
    }
    const dto = payload?.dto || body;
    if (!dto) {
      throw new BadRequestException('Content update data is required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    this.logger.log(
      `Updating content ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.contentService.update({ id, dto, user });
    } catch (error) {
      this.logger.error(
        `Failed to update content ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(['content/:id', 'academy/content/:id'])
  @MessagePattern({ cmd: 'remove_content' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(ContentIdSchema))
  async remove(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid content ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    this.logger.log(
      `Removing content ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.contentService.remove({ id, user });
    } catch (error) {
      this.logger.error(
        `Failed to remove content ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['content/course/:courseId', 'academy/content/course/:courseId'])
  @MessagePattern({ cmd: 'find_content_by_course' })
  @UsePipes(new JoiValidationPipe(CourseIdContentSchema))
  async findByCourse(
    @Param('courseId') paramCourseId?: string,
    @Req() req?: any,
    @Payload() payload?: { courseId: number; user: AuthenticatedUser },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const courseId = Number(rawCourseId);
    if (!courseId || isNaN(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    this.logger.log(
      `Fetching all content for course ID: ${courseId} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.contentService.findByCourse({ courseId, user });
    } catch (error) {
      this.logger.error(
        `Failed to fetch content for course ID ${courseId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['content/search/query', 'academy/content/search/query'])
  @MessagePattern({ cmd: 'search_content' })
  @UsePipes(new JoiValidationPipe(SearchContentSchema))
  async searchContent(
    @Query('query') queryParam?: string,
    @Query('type') typeParam?: string,
    @Query('courseId') courseIdParam?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      query: string;
      type?: string;
      courseId?: number;
      user: AuthenticatedUser;
    },
  ) {
    const query = payload?.query || queryParam;
    if (!query) {
      throw new BadRequestException('Search query is required');
    }
    const type = payload?.type || typeParam;
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : courseIdParam;
    const courseId = rawCourseId ? Number(rawCourseId) : undefined;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    this.logger.log(
      `Searching content with query: "${query}" (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.contentService.searchContent({ query, type, courseId, user } as any);
    } catch (error) {
      this.logger.error(
        `Failed to search content with query "${query}" by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
