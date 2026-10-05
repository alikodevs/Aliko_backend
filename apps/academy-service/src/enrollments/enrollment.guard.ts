import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
//import { Role } from '../generated/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    const enrollmentId = request.params.id;
    if (enrollmentId) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { id: Number(enrollmentId) },
        include: { cohort: { include: { course: true } } },
      });

      if (!enrollment) {
        return false;
      }

      if (user.role === 'INSTRUCTOR') {
        return enrollment.cohort.course.instructorId === user.id;
      }

      if (user.role === 'STUDENT') {
        return enrollment.userId === user.id;
      }
    }

    const cohortId = request.body.cohortId || request.params.cohortId;
    if (cohortId) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: Number(cohortId) },
        include: { course: true },
      });

      if (!cohort) {
        return false;
      }

      if (user.role === 'INSTRUCTOR') {
        return cohort.course.instructorId === user.id;
      }

      if (user.role === 'STUDENT') {
        return true; // Students can enroll themselves
      }
    }

    return false;
  }
}
