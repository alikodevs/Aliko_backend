import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { CompleteOrientationDto } from './dto/complete-orientation.dto';

export const ORIENTATION_ITEMS = [
  { key: 'O-1', title: 'Welcome Session (Instructor Sign-Off)', instructorOnly: true },
  { key: 'O-2', title: 'Program Rules & Attendance Policy', instructorOnly: false },
  { key: 'O-3', title: 'Your Schedule & 90-Day Window', instructorOnly: false },
  { key: 'O-4', title: 'Using the LMS & Practice Quiz', instructorOnly: false },
  { key: 'O-5', title: 'Online Conduct & Academic Integrity', instructorOnly: false },
  { key: 'O-6', title: 'How This Course Works', instructorOnly: false },
  { key: 'O-7', title: 'Lab & Clinical Expectations', instructorOnly: false },
  { key: 'O-8', title: 'Technology Check (Webcam/Mic/Browser)', instructorOnly: false },
  { key: 'O-9', title: 'Sign Enrollment Agreement', instructorOnly: false },
];

@Injectable()
export class OrientationService {
  private readonly logger = new Logger(OrientationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async completeOrientation(
    dto: CompleteOrientationDto,
    user: AuthenticatedUser,
  ) {
    await this.userService.getOrCreateProfile(user);

    const fullChecklist = ORIENTATION_ITEMS.reduce(
      (acc, item) => ({ ...acc, [item.key]: true }),
      {} as Record<string, boolean>,
    );

    const application = await this.prisma.studentAdmissionsApplication.upsert({
      where: {
        userId_cohortId: {
          userId: user.firebaseId,
          cohortId: dto.cohortId,
        },
      },
      update: {
        orientationCompleted: true,
        orientationAttendedAt: new Date(),
        lmsTutorialCompleted: true,
        netiquetteSigned: true,
        techCheckPassed: true,
        orientationChecklist: fullChecklist,
        updatedAt: new Date(),
      },
      create: {
        userId: user.firebaseId,
        cohortId: dto.cohortId,
        orientationCompleted: true,
        orientationAttendedAt: new Date(),
        lmsTutorialCompleted: true,
        netiquetteSigned: true,
        techCheckPassed: true,
        orientationChecklist: fullChecklist,
      },
    });

    this.logger.log(
      `Student ${user.firebaseId} completed mandatory orientation for cohort ${dto.cohortId}. Note: Orientation hours are non-credit under WAC 246-841A-440 (Req 11).`,
    );

    return application;
  }

  async getOrientationStatus(cohortId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    const application = await this.prisma.studentAdmissionsApplication.findUnique({
      where: {
        userId_cohortId: {
          userId: user.firebaseId,
          cohortId,
        },
      },
    });

    const rawChecklist =
      (application?.orientationChecklist as Record<string, boolean> | null) || {};
    const checklist = ORIENTATION_ITEMS.map((item) => ({
      ...item,
      completed: Boolean(rawChecklist[item.key]) || Boolean(application?.orientationCompleted),
    }));
    const completedCount = checklist.filter((i) => i.completed).length;

    return {
      cohortId,
      userId: user.firebaseId,
      orientationCompleted: application?.orientationCompleted ?? false,
      orientationAttendedAt: application?.orientationAttendedAt ?? null,
      lmsTutorialCompleted: application?.lmsTutorialCompleted ?? false,
      netiquetteSigned: application?.netiquetteSigned ?? false,
      techCheckPassed: application?.techCheckPassed ?? false,
      checklist,
      completedCount,
      totalItems: ORIENTATION_ITEMS.length,
      isCreditHour: false, // WABON explicit zero-credit flag
    };
  }

  async updateOrientationItem(
    cohortId: number,
    itemKey: string,
    completed: boolean,
    user: AuthenticatedUser,
    targetUserId?: string,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);
    const validItem = ORIENTATION_ITEMS.find((i) => i.key === itemKey);
    if (!validItem) {
      throw new BadRequestException(`Invalid orientation item key: ${itemKey}`);
    }

    const isInstructorOrAdmin = ['INSTRUCTOR', 'ADMIN', 'COURSE_MANAGER'].includes(profile.role);
    if (validItem.instructorOnly && !isInstructorOrAdmin) {
      throw new ForbiddenException(
        `${itemKey} (${validItem.title}) can only be verified by an instructor or admin.`,
      );
    }

    const studentUserId = isInstructorOrAdmin && targetUserId ? targetUserId : user.firebaseId;
    const existing = await this.prisma.studentAdmissionsApplication.findUnique({
      where: { userId_cohortId: { userId: studentUserId, cohortId } },
    });

    const checklist: Record<string, boolean> = {
      ...((existing?.orientationChecklist as Record<string, boolean> | null) || {}),
      [itemKey]: completed,
    };

    const allNineComplete = ORIENTATION_ITEMS.every((i) => Boolean(checklist[i.key]));

    const updated = await this.prisma.studentAdmissionsApplication.upsert({
      where: { userId_cohortId: { userId: studentUserId, cohortId } },
      update: {
        orientationChecklist: checklist,
        ...(itemKey === 'O-4' ? { lmsTutorialCompleted: completed } : {}),
        ...(itemKey === 'O-5' ? { netiquetteSigned: completed } : {}),
        ...(itemKey === 'O-8' ? { techCheckPassed: completed } : {}),
        ...(itemKey === 'O-9' ? { agreementSigned: completed, agreementSignedAt: completed ? new Date() : null } : {}),
        ...(itemKey === 'O-1' && completed ? { orientationMarkedBy: user.firebaseId } : {}),
        orientationCompleted: allNineComplete,
        orientationAttendedAt: allNineComplete ? new Date() : existing?.orientationAttendedAt ?? null,
      },
      create: {
        userId: studentUserId,
        cohortId,
        orientationChecklist: checklist,
        lmsTutorialCompleted: itemKey === 'O-4' ? completed : false,
        netiquetteSigned: itemKey === 'O-5' ? completed : false,
        techCheckPassed: itemKey === 'O-8' ? completed : false,
        agreementSigned: itemKey === 'O-9' ? completed : false,
        orientationMarkedBy: itemKey === 'O-1' && completed ? user.firebaseId : null,
        orientationCompleted: allNineComplete,
        orientationAttendedAt: allNineComplete ? new Date() : null,
      },
    });

    return {
      cohortId,
      userId: studentUserId,
      itemKey,
      completed,
      orientationCompleted: updated.orientationCompleted,
      checklist,
    };
  }

  async isOrientationCompleted(cohortId: number, userId: string): Promise<boolean> {
    const application = await this.prisma.studentAdmissionsApplication.findUnique({
      where: {
        userId_cohortId: {
          userId,
          cohortId,
        },
      },
    });

    return application?.orientationCompleted ?? false;
  }
}
