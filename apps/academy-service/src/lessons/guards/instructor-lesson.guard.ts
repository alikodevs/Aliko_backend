import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// Removed invalid import: Role is not in prisma client

@Injectable()
export class InstructorLessonGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Only admins and instructors can manage lessons
    if (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      throw new UnauthorizedException(
        'Only instructors and admins can manage lessons',
      );
    }

    // Admin can manage all lessons
    if (user.role === 'ADMIN') {
      return true;
    }

    // For instructors, check if they own the course that the lesson belongs to
    const lessonId = req.params.id || req.params.lessonId;
    const moduleId = req.body.moduleId || req.params.moduleId;

    if (lessonId) {
      return await this.checkLessonOwnership(user.id, parseInt(lessonId));
    }

    if (moduleId) {
      return await this.checkModuleOwnership(user.id, parseInt(moduleId));
    }

    return false;
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

    return String(lesson.module.course.instructorId) === String(instructorId);
  }

  private async checkModuleOwnership(
    instructorId: number,
    moduleId: number,
  ): Promise<boolean> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        course: true,
      },
    });

    if (!module) return false;

    return String(module.course.instructorId) === String(instructorId);
  }
}
