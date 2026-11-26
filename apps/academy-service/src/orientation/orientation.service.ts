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

/**
 * Bidirectional sync: maps O-key ↔ lesson title prefix (0-N) so that
 * completing one side automatically mirrors to the other.
 */
const O_KEY_TO_LESSON_PREFIX: Record<string, string> = {
  'O-1': '0-1', 'O-2': '0-2', 'O-3': '0-3',
  'O-4': '0-4', 'O-5': '0-5', 'O-6': '0-6',
  'O-7': '0-7', 'O-8': '0-8', 'O-9': '0-9',
};

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

    // ── Sync → Module 0 lesson progress ──
    await this.syncAllOrientationLessonsToProgress(user.firebaseId, dto.cohortId);

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

    // ── Sync → Module 0 lesson progress ──
    await this.syncOrientationItemToProgress(studentUserId, cohortId, itemKey, completed);

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

  // ─── Sync helpers: Orientation Checklist → Module 0 Progress ───

  /**
   * When a single O-key is toggled, mirror it to the matching Module 0 lesson's Progress record.
   */
  private async syncOrientationItemToProgress(
    userId: string,
    cohortId: number,
    itemKey: string,
    completed: boolean,
  ) {
    try {
      const lessonPrefix = O_KEY_TO_LESSON_PREFIX[itemKey];
      if (!lessonPrefix) return;

      const cohort = await this.prisma.cohort.findUnique({
        where: { id: cohortId },
        select: { courseId: true },
      });
      if (!cohort?.courseId) return;
      const courseId = cohort.courseId;

      const orientationLesson = await this.prisma.lesson.findFirst({
        where: {
          title: { startsWith: lessonPrefix },
          isOrientationLesson: true,
          module: { courseId, isOrientationModule: true },
        },
        select: { id: true },
      });
      if (!orientationLesson) return;

      if (completed) {
        // Upsert a COMPLETED progress record
        const existing = await this.prisma.progress.findFirst({
          where: { userId, courseId, lessonId: orientationLesson.id, contentId: null },
        });
        if (!existing) {
          await this.prisma.progress.create({
            data: { userId, courseId, lessonId: orientationLesson.id, status: 'COMPLETED' },
          });
        }
      } else {
        // Remove the progress record when un-checking
        await this.prisma.progress.deleteMany({
          where: { userId, courseId, lessonId: orientationLesson.id, contentId: null },
        });
      }
      this.logger.log(
        `Orientation sync → lesson progress: ${itemKey} ${completed ? 'completed' : 'removed'} for user ${userId}, lesson ${orientationLesson.id}`,
      );
    } catch (err) {
      this.logger.warn(`Orientation → Progress sync failed for ${itemKey}: ${err.message}`);
    }
  }

  /**
   * Bulk-sync all 9 orientation items to Module 0 progress (used by completeOrientation).
   */
  private async syncAllOrientationLessonsToProgress(userId: string, cohortId: number) {
    for (const item of ORIENTATION_ITEMS) {
      await this.syncOrientationItemToProgress(userId, cohortId, item.key, true);
    }
  }

  /**
   * Reverse sync: called by ProgressAndAnalyticsService when a Module 0 lesson is completed.
   * Maps the lesson title back to an O-key and updates the orientation checklist.
   */
  async syncLessonProgressToOrientation(
    userId: string,
    courseId: number,
    lessonTitle: string,
    completed: boolean,
  ) {
    try {
      // Find which O-key this lesson maps to (e.g. "0-3 · Your schedule" → "O-3")
      let matchedKey: string | null = null;
      for (const [oKey, prefix] of Object.entries(O_KEY_TO_LESSON_PREFIX)) {
        if (lessonTitle.startsWith(prefix)) {
          matchedKey = oKey;
          break;
        }
      }
      if (!matchedKey) return;

      // Find the cohort for this course + user
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId,
          OR: [{ courseId }, { cohort: { courseId } }],
        },
        include: { cohort: true },
      });
      const cohortId = enrollment?.cohortId;
      if (!cohortId) return;

      // Determine whether the matched item is instructorOnly
      const item = ORIENTATION_ITEMS.find((i) => i.key === matchedKey);
      if (item?.instructorOnly) {
        // O-1 (Welcome Session) can only be marked by an instructor, so we skip reverse sync for it
        this.logger.log(`Skipping reverse sync for instructor-only item ${matchedKey}`);
        return;
      }

      const existing = await this.prisma.studentAdmissionsApplication.findUnique({
        where: { userId_cohortId: { userId, cohortId } },
      });

      const checklist: Record<string, boolean> = {
        ...((existing?.orientationChecklist as Record<string, boolean> | null) || {}),
        [matchedKey]: completed,
      };

      const allNineComplete = ORIENTATION_ITEMS.every((i) => Boolean(checklist[i.key]));

      await this.prisma.studentAdmissionsApplication.upsert({
        where: { userId_cohortId: { userId, cohortId } },
        update: {
          orientationChecklist: checklist,
          ...(matchedKey === 'O-4' ? { lmsTutorialCompleted: completed } : {}),
          ...(matchedKey === 'O-5' ? { netiquetteSigned: completed } : {}),
          ...(matchedKey === 'O-8' ? { techCheckPassed: completed } : {}),
          ...(matchedKey === 'O-9' ? { agreementSigned: completed, agreementSignedAt: completed ? new Date() : null } : {}),
          orientationCompleted: allNineComplete,
          orientationAttendedAt: allNineComplete ? new Date() : existing?.orientationAttendedAt ?? null,
        },
        create: {
          userId,
          cohortId,
          orientationChecklist: checklist,
          lmsTutorialCompleted: matchedKey === 'O-4' ? completed : false,
          netiquetteSigned: matchedKey === 'O-5' ? completed : false,
          techCheckPassed: matchedKey === 'O-8' ? completed : false,
          agreementSigned: matchedKey === 'O-9' ? completed : false,
          orientationCompleted: allNineComplete,
          orientationAttendedAt: allNineComplete ? new Date() : null,
        },
      });

      this.logger.log(
        `Progress sync → orientation checklist: lesson "${lessonTitle}" → ${matchedKey} ${completed ? 'completed' : 'removed'} for user ${userId}`,
      );
    } catch (err) {
      this.logger.warn(`Progress → Orientation sync failed for "${lessonTitle}": ${err.message}`);
    }
  }
}
