import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Admin can access all content
    if (user.role === 'ADMIN') {
      return true;
    }

    // Get content/course/lesson IDs from params or body
    const contentId =
      req.params.contentId || req.params.id || req.body.contentId;
    const lessonId = req.params.lessonId || req.body.lessonId;
    const courseId = req.params.courseId || req.body.courseId;

    // Instructors: allow if they own the course for the provided identifiers
    if (user.role === 'INSTRUCTOR') {
      if (contentId) {
        return await this.checkContentOwnership(user.id, parseInt(contentId));
      }
      if (lessonId) {
        return await this.checkLessonOwnership(user.id, parseInt(lessonId));
      }
      if (courseId) {
        return await this.checkInstructorCourse(user.id, parseInt(courseId));
      }
    }

    // Students: must be enrolled in the course containing the requested content
    if (contentId) {
      return await this.checkContentAccess(user.id, parseInt(contentId));
    }

    if (lessonId) {
      return await this.checkLessonAccess(user.id, parseInt(lessonId));
    }

    if (courseId) {
      return await this.checkCourseAccess(user.id, parseInt(courseId));
    }

    return false;
  }

  private async checkContentOwnership(
    instructorId: number,
    contentId: number,
  ): Promise<boolean> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });
    if (!content) return false;
    return content.lesson.module.course.instructorId === String(instructorId);
  }

  private async checkLessonOwnership(
    instructorId: number,
    lessonId: number,
  ): Promise<boolean> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });
    if (!lesson) return false;
    return lesson.module.course.instructorId === String(instructorId);
  }

  private async checkInstructorCourse(
    instructorId: number,
    courseId: number,
  ): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    return !!course && course.instructorId === String(instructorId);
  }

  private async checkContentAccess(
    userId: number,
    contentId: number,
  ): Promise<boolean> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!content) return false;

    return await this.checkCourseAccess(
      userId,
      content.lesson.module.course.id,
    );
  }

  private async checkLessonAccess(
    userId: number,
    lessonId: number,
  ): Promise<boolean> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) return false;

    return await this.checkCourseAccess(userId, lesson.module.course.id);
  }

  private async checkCourseAccess(
    userId: number,
    courseId: number,
  ): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: String(userId),
        OR: [{ courseId: courseId }, { cohort: { courseId: courseId } }],
      },
    });

    return !!enrollment;
  }
}
