import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// Removed invalid import: Role is not in prisma client

@Injectable()
export class CohortAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Admin can access all cohorts
    if (user.role === 'ADMIN') {
      return true;
    }

    const cohortId = req.params.id || req.params.cohortId;
    const courseId = req.params.courseId || req.query.courseId;

    if (cohortId) {
      return await this.checkCohortAccess(
        user.id,
        parseInt(cohortId),
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

    // For listing cohorts, students can see cohorts they're enrolled in, instructors can see cohorts for their courses
    if (user.role === 'STUDENT') {
      return true; // Students can browse cohorts
    }

    if (user.role === 'INSTRUCTOR') {
      return true; // Instructors can see cohorts for their courses
    }

    return false;
  }

  private async checkCohortAccess(
    userId: number | string,
    cohortId: number,
    userRole: string,
  ): Promise<boolean> {
    // Convert userId to string (Prisma expects string for userId)
    const userIdStr = userId.toString();
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        course: true,
        enrollments: {
          where: { userId: userIdStr },
        },
      },
    });

    if (!cohort) return false;

    // Students can access cohorts they're enrolled in
    if (userRole === 'STUDENT') {
      return cohort.enrollments.length > 0;
    }

    // Instructors can access cohorts for courses they teach
    if (userRole === 'INSTRUCTOR') {
      return cohort.course.instructorId === userIdStr;
    }

    return false;
  }

  private async checkCourseAccess(
    userId: number | string,
    courseId: number,
    userRole: string,
  ): Promise<boolean> {
    // Convert userId to string (Prisma expects string for userId)
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

    // Students can access cohorts for courses they're enrolled in
    if (userRole === 'STUDENT') {
      return course.enrollments.length > 0;
    }

    // Instructors can access cohorts for courses they teach
    if (userRole === 'INSTRUCTOR') {
      return course.instructorId === userIdStr;
    }

    return false;
  }
}
