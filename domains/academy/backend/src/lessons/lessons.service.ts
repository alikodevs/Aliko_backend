import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { AuthenticatedUser, UserService } from '../user/user.service';

@Injectable()
export class LessonsService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(dto: CreateLessonDto, user: AuthenticatedUser) {
    const { title, type, dueDate, maxScore, moduleId, contents } = dto;
    const academyProfile = await this.userService.getOrCreateProfile(user);

    // Fetch the module and its parent course for the ownership check
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    const isInstructor = module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to add a lesson to this module.',
      );
    }

    return await this.prisma.lesson.create({
      data: {
        title,
        type,
        maxScore,
        order: dto.order || 0,
        unlockRules: dto.unlockRules || ({} as object),
        dueDate: dueDate ? new Date(dueDate) : null,
        module: { connect: { id: moduleId } },
        ...(contents && contents.length > 0
          ? {
              contents: {
                create: contents.map((c) => {
                  const { lessonId: _lessonId, ...rest } = c;
                  return rest;
                }),
              },
            }
          : {}),
      },
    });
  }

  async findByModule(
    moduleId: number,
    user: AuthenticatedUser,
    query: Record<string, any> = {},
  ) {
    console.log(`=== Authorization Check for Lessons ===`);
    console.log(`User ID: ${user.firebaseId}`);
    console.log(`Module ID: ${moduleId}`);

    const academyProfile = await this.userService.getOrCreateProfile(user);
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });

    if (!module) throw new NotFoundException('Module not found');

    const courseId = module.courseId;
    const instructorId = module.course.instructorId;

    // AUTHORIZATION: Check if the user is an admin, the course instructor, OR enrolled.
    const isAdmin = academyProfile.role === 'ADMIN';
    const isInstructor = instructorId === user.firebaseId;
    let isEnrolled = false;

    if (!isAdmin && !isInstructor) {
      // Check for enrollment
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: user.firebaseId,
          OR: [
            { courseId: courseId, cohortId: null },
            { cohort: { courseId: courseId } },
          ],
        },
      });
      isEnrolled = !!enrollment;
    }

    if (!isAdmin && !isInstructor && !isEnrolled) {
      throw new ForbiddenException(
        'You must be enrolled in this course to view its lessons.',
      );
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [lessons, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { moduleId },
        skip,
        take: pageSize,
        orderBy: { order: 'asc' },
        include: { contents: true, exercises: true },
      }),
      this.prisma.lesson.count({ where: { moduleId } }),
    ]);

    return {
      items: lessons,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByInstructor(
    user: AuthenticatedUser,
    query: Record<string, any> = {},
  ) {
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

    const where: Record<string, any> = {
      module: {
        course: {
          instructorId: user.firebaseId,
        },
      },
    };

    if (query.moduleId) where.moduleId = Number(query.moduleId);
    if (query.type) where.type = query.type;

    const [lessons, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          module: {
            include: {
              course: {
                select: { id: true, title: true },
              },
            },
          },
        },
      }),
      this.prisma.lesson.count({ where }),
    ]);

    return {
      items: lessons,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { contents: true, module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // AUTHORIZATION: Same logic as findByModule
    const isInstructor = lesson.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';
    let isEnrolled = false;
    if (!isInstructor && !isAdmin) {
      // Check for direct course enrollment (no cohort)
      const directEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: user.firebaseId,
          courseId: lesson.module.courseId,
          cohortId: null, // Direct enrollment without cohort
        },
      });

      if (directEnrollment) {
        isEnrolled = true;
      } else {
        // Check for cohort-based enrollment
        const cohortEnrollment = await this.prisma.enrollment.findFirst({
          where: {
            userId: user.firebaseId,
            cohort: { courseId: lesson.module.courseId },
          },
        });
        isEnrolled = !!cohortEnrollment;
      }
    }

    if (!isInstructor && !isAdmin && !isEnrolled) {
      throw new ForbiddenException(
        'You must be enrolled in this course to view this lesson.',
      );
    }

    // We don't need to return the nested module/course info to the client
    const { module: _module, ...lessonWithoutNesting } = lesson;

    // Check if the lesson is locked for this user (if they are a student)
    let isLocked = false;
    if (academyProfile.role === 'STUDENT' && lesson.unlockRules) {
      const rules = lesson.unlockRules as any;
      if (rules.prerequisites && Array.isArray(rules.prerequisites)) {
        const prerequisiteLessonIds = rules.prerequisites
          .filter((pre: any) => pre.type === 'LESSON' && typeof pre.id === 'number')
          .map((pre: any) => pre.id);

        if (prerequisiteLessonIds.length > 0) {
          const completedPrerequisites = await this.prisma.progress.count({
            where: {
              userId: user.firebaseId,
              lessonId: { in: prerequisiteLessonIds },
              status: 'COMPLETED',
            },
          });

          if (completedPrerequisites < prerequisiteLessonIds.length) {
            isLocked = true;
          }
        }
      }
    }

    // Strict enforcement: Hide contents if locked
    const result = {
      ...lessonWithoutNesting,
      isLocked,
    };

    if (isLocked) {
      result.contents = [];
    }

    return result;
  }

  async update(id: number, dto: UpdateLessonDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const { dueDate, moduleId, contents, ...rest } = dto;

    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    const isInstructor = lesson.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to update this lesson.',
      );
    }

    return await this.prisma.lesson.update({
      where: { id },
      data: {
        ...rest,
        order: dto.order !== undefined ? dto.order : lesson.order,
        unlockRules:
          dto.unlockRules !== undefined ? dto.unlockRules : lesson.unlockRules,
        ...(dueDate !== undefined
          ? { dueDate: dueDate ? new Date(dueDate) : null }
          : {}),
        ...(moduleId !== undefined
          ? { module: { connect: { id: moduleId } } }
          : {}),
        ...(contents && contents.length > 0
          ? {
              contents: {
                deleteMany: {},
                create: contents.map((c) => {
                  const { lessonId: _lessonId, ...rest } = c;
                  return rest;
                }),
              },
            }
          : {}),
      },
    });
  }

  async remove(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    const isInstructor = lesson.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this lesson.',
      );
    }

    return await this.prisma.lesson.delete({ where: { id } });
  }

  // This method is now redundant since findOne and findByModule include contents.
  // But if you keep it, it needs the same security check.
  async getContentByLesson(lessonId: number, user: AuthenticatedUser) {
    const lesson = await this.findOne(lessonId, user); // Re-use the secure findOne logic
    return lesson.contents;
  }
}
