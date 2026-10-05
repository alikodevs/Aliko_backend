import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// Removed invalid import: Role is not in prisma client

@Injectable()
export class LessonAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Admin can access all lessons
    if (user.role === 'ADMIN') {
      return true;
    }

    const lessonId = req.params.id || req.params.lessonId;
    const moduleId = req.params.moduleId;

    if (lessonId) {
      return await this.checkLessonAccess(
        user.id,
        parseInt(lessonId),
        user.role,
      );
    }

    if (moduleId) {
      return await this.checkModuleAccess(
        user.id,
        parseInt(moduleId),
        user.role,
      );
    }

    return false;
  }

  private async checkLessonAccess(
    userId: number,
    lessonId: number,
    userRole: string,
  ): Promise<boolean> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: { userId: String(userId) },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) return false;

    // Students can access lessons for courses they're enrolled in
    if (userRole === 'STUDENT') {
      return lesson.module.course.enrollments.length > 0;
    }

    // Instructors can access lessons for courses they teach
    if (userRole === 'INSTRUCTOR') {
      return String(lesson.module.course.instructorId) === String(userId);
    }

    return false;
  }

  private async checkModuleAccess(
    userId: number,
    moduleId: number,
    userRole: string,
  ): Promise<boolean> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          include: {
            enrollments: {
              where: { userId: String(userId) },
            },
          },
        },
      },
    });

    if (!module) return false;

    // Students can access modules for courses they're enrolled in
    if (userRole === 'STUDENT') {
      return module.course.enrollments.length > 0;
    }

    // Instructors can access modules for courses they teach
    if (userRole === 'INSTRUCTOR') {
      return String(module.course.instructorId) === String(userId);
    }

    return false;
  }
}
