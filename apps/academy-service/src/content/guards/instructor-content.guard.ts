import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// Removed invalid import: Role is not in prisma client

@Injectable()
export class InstructorContentGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Only admins and instructors can manage content
    if (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      throw new UnauthorizedException(
        'Only instructors and admins can manage content',
      );
    }

    // Admin can manage all content
    if (user.role === 'ADMIN') {
      return true;
    }

    // For instructors, check if they own the course
    const contentId = req.params.contentId || req.params.id;
    const lessonId = req.params.lessonId || req.body.lessonId; // read from body for create
    const courseId = req.params.courseId || req.body.courseId;

    if (contentId) {
      return await this.checkContentOwnership(user.id, parseInt(contentId));
    }

    if (lessonId) {
      return await this.checkLessonOwnership(user.id, parseInt(lessonId));
    }

    if (courseId) {
      return await this.checkCourseOwnership(user.id, parseInt(courseId));
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

  private async checkCourseOwnership(
    instructorId: number,
    courseId: number,
  ): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) return false;

    return course.instructorId === String(instructorId);
  }
}
