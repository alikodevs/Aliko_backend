import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// Removed invalid import: Role is not in prisma client

@Injectable()
export class CourseAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Admin can access all courses
    if (user.role === 'ADMIN') {
      return true;
    }

    const courseId = req.params.id || req.params.courseId;

    if (courseId) {
      return await this.checkCourseAccess(
        user.id,
        parseInt(courseId),
        user.role,
      );
    }

    // For listing courses, students can see published courses, instructors can see their courses
    if (user.role === 'STUDENT') {
      return true; // Students can browse published courses
    }

    if (user.role === 'INSTRUCTOR') {
      return true; // Instructors can see their own courses
    }

    return false;
  }

  private async checkCourseAccess(
    userId: number,
    courseId: number,
    userRole: string,
  ): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: {
          where: { userId: String(userId) },
        },
      },
    });

    if (!course) return false;

    // Students can access courses they're enrolled in
    if (userRole === 'STUDENT') {
      return course.status === 'PUBLISHED' || course.enrollments.length > 0;
    }

    // Instructors can access courses they teach
    if (userRole === 'INSTRUCTOR') {
      return String(course.instructorId) === String(userId);
    }

    return false;
  }
}
