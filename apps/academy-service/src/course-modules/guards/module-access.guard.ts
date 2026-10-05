import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// Removed invalid import: Role is not in prisma client

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Admin can access all modules
    if (user.role === 'ADMIN') {
      return true;
    }

    const moduleId = req.params.id || req.params.moduleId;
    const courseId = req.params.courseId;

    if (moduleId) {
      return await this.checkModuleAccess(
        user.id,
        parseInt(moduleId),
        user.role,
      );
    }

    if (courseId) {
      return await this.checkCourseAccess(
        user.id,
        parseInt(courseId),
        user.role,
      );
    }

    return false;
  }

  private async checkModuleAccess(
    userId: number | string,
    moduleId: number,
    userRole: string,
  ): Promise<boolean> {
    const userIdStr = userId.toString();
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          include: {
            enrollments: {
              where: { userId: userIdStr },
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
      return module.course.instructorId === userIdStr;
    }

    return false;
  }

  private async checkCourseAccess(
    userId: number | string,
    courseId: number,
    userRole: string,
  ): Promise<boolean> {
    const userIdStr = userId.toString();
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: {
          where: { userId: userIdStr },
        },
      },
    });

    if (!course) return false;

    // Students can access modules for courses they're enrolled in
    if (userRole === 'STUDENT') {
      return course.enrollments.length > 0;
    }

    // Instructors can access modules for courses they teach
    if (userRole === 'INSTRUCTOR') {
      return course.instructorId === userIdStr;
    }

    return false;
  }
}
