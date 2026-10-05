import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// Removed invalid import: Role is not in prisma client

@Injectable()
export class InstructorModuleGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Only admins and instructors can manage modules
    if (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      throw new UnauthorizedException(
        'Only instructors and admins can manage modules',
      );
    }

    // Admin can manage all modules
    if (user.role === 'ADMIN') {
      return true;
    }

    // For instructors, check if they own the course that the module belongs to
    const moduleId = req.params.id || req.params.moduleId;
    const courseId = req.body.courseId || req.params.courseId;

    if (moduleId) {
      return await this.checkModuleOwnership(user.id, parseInt(moduleId));
    }

    if (courseId) {
      return await this.checkCourseOwnership(user.id, parseInt(courseId));
    }

    return false;
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

  private async checkCourseOwnership(
    instructorId: number,
    courseId: number,
  ): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) return false;

    return String(course.instructorId) === String(instructorId);
  }
}
