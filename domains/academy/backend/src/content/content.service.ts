import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { UploadContentDto } from './dto/upload-content.dto';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ContentType } from '../generated/client';

interface UploadedFile {
  buffer: Buffer | string; // Buffer or base64 encoded string
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    @Inject('FILE_UPLOAD_SERVICE')
    private readonly fileUploadClient: ClientProxy,
  ) {}

  async create(dto: CreateContentDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      include: { module: { include: { course: true } } },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    const isInstructor = lesson.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin)
      throw new ForbiddenException(
        'You do not have permission to add content to this lesson.',
      );
    if (!dto.lessonId)
      throw new BadRequestException(
        'lessonId is required for direct content creation',
      );

    return this.prisma.content.create({ data: dto as any });
  }

  async uploadFile(
    dto: UploadContentDto,
    file: UploadedFile | null,
    user: AuthenticatedUser,
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      include: { module: { include: { course: true } } },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    const isInstructor = lesson.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin)
      throw new ForbiddenException(
        'You do not have permission to add content to this lesson.',
      );

    // Case 1: File URL already provided (e.g., from API Gateway refactor)
    if (dto.contentUrl) {
      console.log(
        '[DEBUG] Using provided contentUrl:',
        dto.contentUrl,
        'for lessonId:',
        dto.lessonId,
      );
      try {
        return await this.prisma.content.create({
          data: {
            title: dto.title,
            type: dto.type as any,
            url: dto.contentUrl,
            lessonId: Number(dto.lessonId),
          },
        });
      } catch (prismaError: any) {
        console.error('[ERROR] Prisma create content failed:', prismaError);
        throw prismaError;
      }
    }

    // Case 2: File buffer provided (legacy way or internal call)
    if (!file) {
      throw new BadRequestException('Either contentUrl or file is required');
    }

    // Allow all file formats
    const allowedTypes = this.getAllowedFileTypes(dto.type);
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      // For legacy/backward compatibility, we still log but don't block
      console.log(`[DEBUG] MIME type ${file.mimetype} for ${dto.type} is not in standard list, but allowing anyway.`);
    }

    try {
      console.log('[DEBUG] Starting file serialization and upload...');
      // Decode base64 buffer if it's a string (from microservice transport)
      const fileBuffer =
        typeof file.buffer === 'string'
          ? Buffer.from(file.buffer, 'base64')
          : file.buffer;

      const uploadPayload = {
        file: {
          buffer: fileBuffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        folder: `academy/courses/${lesson.module.courseId}/lessons/${dto.lessonId}`,
      };

      console.log('[DEBUG] Sending upload request to FileUploadService...');
      const uploadResponse = await firstValueFrom(
        this.fileUploadClient.send({ cmd: 'upload_file' }, uploadPayload),
      );

      console.log(
        '[DEBUG] Upload response received:',
        JSON.stringify(uploadResponse),
      );

      if (!uploadResponse || !uploadResponse.url) {
        throw new Error('Upload service returned invalid response');
      }

      console.log('[DEBUG] Creating content record in Prisma...');
      try {
        return await this.prisma.content.create({
          data: {
            title: dto.title,
            type: dto.type as any,
            url: uploadResponse.url,
            lessonId: Number(dto.lessonId),
          },
        });
      } catch (prismaError: any) {
        console.error(
          '[ERROR] Prisma create content failed after upload:',
          prismaError,
        );
        throw prismaError;
      }
    } catch (error: any) {
      console.error('[ERROR] Content uploadFile failed:', error);
      throw new BadRequestException(
        'File upload failed: ' + (error.message || 'Unknown error'),
      );
    }
  }

  private getAllowedFileTypes(contentType: string): string[] {
    switch (contentType) {
      case 'VIDEO':
        return ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
      case 'PDF':
        return ['application/pdf'];
      case 'QUIZ':
        return ['application/json'];
      case 'ASSIGNMENT':
        return [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
      default:
        return ['application/octet-stream'];
    }
  }

  async findAll(user: AuthenticatedUser, query: any = {}) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (academyProfile.role !== 'ADMIN')
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.content.count(),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByLesson(
    lessonId: number,
    user: AuthenticatedUser,
    query: any = {},
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    const isAdmin = academyProfile.role === 'ADMIN';
    const isInstructor = lesson.module.course.instructorId === user.firebaseId;

    // Check enrollment
    let isEnrolled = false;
    if (!isAdmin && !isInstructor) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: user.firebaseId,
          OR: [
            { courseId: lesson.module.courseId, cohortId: null },
            { cohort: { courseId: lesson.module.courseId } },
          ],
          status: 'ACTIVE',
        },
      });
      isEnrolled = !!enrollment;
    }

    if (!isAdmin && !isInstructor && !isEnrolled)
      throw new ForbiddenException(
        'You must be enrolled in this course to view its content.',
      );

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where: { lessonId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.content.count({ where: { lessonId } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByInstructor(user: AuthenticatedUser, query: any = {}) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException('Instructor role required');
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const where: any = {
      lesson: {
        module: {
          course: {
            instructorId: user.firebaseId,
          },
        },
      },
    };

    if (query.type) where.type = query.type;
    if (query.lessonId) where.lessonId = Number(query.lessonId);

    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              module: {
                select: {
                  id: true,
                  title: true,
                  course: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(payload: { id: number; user: AuthenticatedUser }) {
    const content = await this.prisma.content.findUnique({
      where: { id: payload.id },
    });
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  async update(payload: {
    id: number;
    dto: UpdateContentDto;
    user: AuthenticatedUser;
  }) {
    const academyProfile = await this.userService.getOrCreateProfile(
      payload.user,
    );

    const content = await this.prisma.content.findUnique({
      where: { id: payload.id },
      include: {
        lesson: { include: { module: { include: { course: true } } } },
      },
    });

    if (!content) throw new NotFoundException('Content not found');

    const isInstructor =
      content.lesson.module.course.instructorId === payload.user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin)
      throw new ForbiddenException(
        'You do not have permission to update this content.',
      );

    return this.prisma.content.update({
      where: { id: payload.id },
      data: payload.dto as any,
    });
  }

  async remove(payload: { id: number; user: AuthenticatedUser }) {
    const academyProfile = await this.userService.getOrCreateProfile(
      payload.user,
    );

    const content = await this.prisma.content.findUnique({
      where: { id: payload.id },
      include: {
        lesson: { include: { module: { include: { course: true } } } },
      },
    });

    if (!content) throw new NotFoundException('Content not found');

    const isInstructor =
      content.lesson.module.course.instructorId === payload.user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin)
      throw new ForbiddenException(
        'You do not have permission to delete this content.',
      );

    return this.prisma.content.delete({ where: { id: payload.id } });
  }

  async findByCourse(payload: { courseId: number; user: AuthenticatedUser }) {
    const academyProfile = await this.userService.getOrCreateProfile(
      payload.user,
    );

    const course = await this.prisma.course.findUnique({
      where: { id: payload.courseId },
      include: {
        modules: {
          include: {
            lessons: { include: { contents: true } },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = academyProfile.role === 'ADMIN';
    if (!isAdmin) throw new ForbiddenException('You do not have permission.');

    return course.modules.flatMap((m) => m.lessons.flatMap((l) => l.contents));
  }

  async searchContent(payload: {
    query: string;
    type?: string;
    courseId?: number;
    user: AuthenticatedUser;
  }) {
    const academyProfile = await this.userService.getOrCreateProfile(
      payload.user,
    );

    const isAdmin = academyProfile.role === 'ADMIN';
    const whereClause: any = {
      title: { contains: payload.query, mode: 'insensitive' },
    };
    if (payload.type) whereClause.type = payload.type;
    if (payload.courseId)
      whereClause.lesson = { module: { courseId: payload.courseId } };

    if (!isAdmin) {
      // Add enrollment checks if needed
    }

    return this.prisma.content.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }
}
