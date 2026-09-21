import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { ScheduleType } from '../generated/client';
import { CreateTeachingScheduleDto, UpdateTeachingScheduleDto } from './dto';

function assertUser(
  user?: AuthenticatedUser,
): asserts user is AuthenticatedUser {
  if (!user) {
    throw new ForbiddenException('Authentication required');
  }
}

export interface TeachingSchedule {
  id: number;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: ScheduleType;
  courseId: number;
  instructorId: string;
  isRecurring: boolean;
  recurrencePattern?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TeachingScheduleService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async getInstructorSchedules(user: AuthenticatedUser) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Only instructors and admins can view teaching schedules.',
      );
    }

    // Get teaching schedules for this instructor
    const schedules = await this.prisma.teachingSchedule.findMany({
      where: { instructorId: user.firebaseId },
      orderBy: { startTime: 'asc' },
      include: {
        course: true,
        cohort: true,
      },
    });

    return schedules;
  }

  async getCourseSchedules(courseId: number, user: AuthenticatedUser) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    // Check if user has access to this course
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Authorization check
    if (academyProfile.role === 'STUDENT') {
      // Students can only see schedules for courses they're enrolled in
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: user.firebaseId,
          courseId: courseId,
        },
      });

      if (!enrollment) {
        throw new ForbiddenException('You are not enrolled in this course');
      }
    } else if (academyProfile.role === 'INSTRUCTOR') {
      // Instructors can only see schedules for their own courses
      if (course.instructorId !== user.firebaseId) {
        throw new ForbiddenException(
          'You do not have permission to view this course schedule',
        );
      }
    }
    // Admins can see all schedules

    // Get teaching schedules for this course
    const schedules = await this.prisma.teachingSchedule.findMany({
      where: { courseId: courseId },
      orderBy: { startTime: 'asc' },
      include: {
        course: true,
        cohort: true,
      },
    });

    return schedules;
  }

  async createSchedule(
    scheduleData: CreateTeachingScheduleDto,
    user: AuthenticatedUser,
  ) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Only instructors and admins can create teaching schedules.',
      );
    }

    // Log the incoming schedule data for debugging
    console.log('Creating schedule with data:', scheduleData);

    // Validate that the course exists and belongs to the instructor (if not admin)
    const course = await this.prisma.course.findUnique({
      where: { id: scheduleData.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (
      academyProfile.role === 'INSTRUCTOR' &&
      course.instructorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You can only create schedules for your own courses',
      );
    }

    // Validate cohort constraints if provided
    if (scheduleData.cohortId) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: scheduleData.cohortId },
      });
      if (!cohort) {
        throw new NotFoundException('Cohort not found');
      }
      if (cohort.courseId !== scheduleData.courseId) {
        throw new BadRequestException('Cohort does not belong to this course');
      }
    }

    // Validate time constraints
    if (new Date(scheduleData.startTime) >= new Date(scheduleData.endTime)) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Create the teaching schedule
    const newSchedule = await this.prisma.teachingSchedule.create({
      data: {
        title: scheduleData.title,
        description: scheduleData.description,
        startTime: new Date(scheduleData.startTime),
        endTime: new Date(scheduleData.endTime),
        type: scheduleData.type,
        courseId: scheduleData.courseId,
        instructorId: user.firebaseId,
        isRecurring: scheduleData.isRecurring || false,
        recurrencePattern: scheduleData.recurrencePattern,
        cohortId: scheduleData.cohortId || null,
      },
      include: {
        course: true,
        cohort: true,
      },
    });

    return newSchedule;
  }

  async updateSchedule(
    scheduleId: number,
    updateData: UpdateTeachingScheduleDto,
    user: AuthenticatedUser,
  ) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Only instructors and admins can update teaching schedules.',
      );
    }

    // Find the existing schedule
    const existingSchedule = await this.prisma.teachingSchedule.findUnique({
      where: { id: scheduleId },
      include: { course: true },
    });

    if (!existingSchedule) {
      throw new NotFoundException('Teaching schedule not found');
    }

    // Authorization check
    if (
      academyProfile.role === 'INSTRUCTOR' &&
      existingSchedule.instructorId !== user.firebaseId
    ) {
      throw new ForbiddenException('You can only update your own schedules');
    }

    // Validate time constraints if provided
    if (updateData.startTime && updateData.endTime) {
      if (new Date(updateData.startTime) >= new Date(updateData.endTime)) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    // Validate cohort constraints if provided
    if (updateData.cohortId) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: updateData.cohortId },
      });
      if (!cohort) {
        throw new NotFoundException('Cohort not found');
      }
      if (cohort.courseId !== existingSchedule.courseId) {
        throw new BadRequestException('Cohort does not belong to this course');
      }
    }

    // Update the teaching schedule
    const updatedSchedule = await this.prisma.teachingSchedule.update({
      where: { id: scheduleId },
      data: {
        title: updateData.title,
        description: updateData.description,
        startTime: updateData.startTime
          ? new Date(updateData.startTime)
          : undefined,
        endTime: updateData.endTime ? new Date(updateData.endTime) : undefined,
        type: updateData.type,
        isRecurring: updateData.isRecurring,
        recurrencePattern: updateData.recurrencePattern,
        cohortId: updateData.cohortId !== undefined ? updateData.cohortId : undefined,
      },
      include: {
        course: true,
        cohort: true,
      },
    });

    return updatedSchedule;
  }

  async deleteSchedule(scheduleId: number, user: AuthenticatedUser) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Only instructors and admins can delete teaching schedules.',
      );
    }

    // Find the existing schedule
    const existingSchedule = await this.prisma.teachingSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existingSchedule) {
      throw new NotFoundException('Teaching schedule not found');
    }

    // Authorization check
    if (
      academyProfile.role === 'INSTRUCTOR' &&
      existingSchedule.instructorId !== user.firebaseId
    ) {
      throw new ForbiddenException('You can only delete your own schedules');
    }

    // Delete the teaching schedule
    await this.prisma.teachingSchedule.delete({
      where: { id: scheduleId },
    });

    return { message: 'Schedule deleted successfully' };
  }

  async getScheduleById(scheduleId: number, user: AuthenticatedUser) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    // Find the schedule
    const schedule = await this.prisma.teachingSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        course: true,
        cohort: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Teaching schedule not found');
    }

    // Authorization check
    if (academyProfile.role === 'STUDENT') {
      // Students can only see schedules for courses they're enrolled in
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: user.firebaseId,
          courseId: schedule.courseId,
        },
      });

      if (!enrollment) {
        throw new ForbiddenException(
          'You do not have permission to view this schedule',
        );
      }
    } else if (academyProfile.role === 'INSTRUCTOR') {
      // Instructors can only see their own schedules
      if (schedule.instructorId !== user.firebaseId) {
        throw new ForbiddenException(
          'You do not have permission to view this schedule',
        );
      }
    }
    // Admins can see all schedules

    return schedule;
  }
}
