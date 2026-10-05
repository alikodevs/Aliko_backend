import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// Removed invalid import: Role is not in prisma client

@Injectable()
export class InstructorCohortGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Only admins and instructors can manage cohorts
    if (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      throw new UnauthorizedException(
        'Only instructors and admins can manage cohorts',
      );
    }

    // Admin can manage all cohorts
    if (user.role === 'ADMIN') {
      return true;
    }

    // For instructors, check if they own the course that the cohort belongs to
    const cohortId = req.params.id || req.params.cohortId;
    const courseId = req.body.courseId || req.params.courseId;

    if (cohortId) {
      return await this.checkCohortOwnership(user.id, parseInt(cohortId));
    }

    if (courseId) {
      return await this.checkCourseOwnership(user.id, parseInt(courseId));
    }

    return false;
  }

  private async checkCohortOwnership(
    instructorId: number | string,
    cohortId: number,
  ): Promise<boolean> {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        course: true,
      },
    });

    if (!cohort) return false;

    // Convert instructorId to string for comparison
    return cohort.course.instructorId === instructorId.toString();
  }

  private async checkCourseOwnership(
    instructorId: number | string,
    courseId: number,
  ): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) return false;

    // Convert instructorId to string for comparison
    return course.instructorId === instructorId.toString();
  }
}
