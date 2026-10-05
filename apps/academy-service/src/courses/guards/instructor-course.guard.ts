import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// Removed invalid import: Role is not in prisma client

@Injectable()
export class InstructorCourseGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Only admins and instructors can manage courses
    if (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      throw new UnauthorizedException(
        'Only instructors and admins can manage courses',
      );
    }

    // Admin can manage all courses
    if (user.role === 'ADMIN') {
      return true;
    }

    // For instructors, check if they own the course
    const courseId = req.params.id || req.params.courseId;
    const instructorId = req.body.instructorId;

    if (courseId) {
      return await this.checkCourseOwnership(user.id, parseInt(courseId));
    }

    // For creating courses, check if instructor is creating for themselves
    if (instructorId && user.role === 'INSTRUCTOR') {
      return parseInt(instructorId) === user.id;
    }

    // If no courseId, allow instructors to create courses for themselves
    return user.role === 'INSTRUCTOR';
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
