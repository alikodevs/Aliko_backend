import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { SeatTimeHeartbeatDto } from './dto';

/**
 * Active Seat-Time Heartbeat Engine (WAC 246-841A-440 Req 19).
 *
 * Tracks active learner engagement seconds with server-side idle detection
 * and clamps. The LMS client sends periodic heartbeat pulses (30-60s interval)
 * reporting active seconds since the last pulse. The server:
 *   1. Clamps activeSeconds to MAX_HEARTBEAT_ACTIVE_SECONDS (120s)
 *   2. Rejects pulses where idleSeconds > activeSeconds (fabrication guard)
 *   3. Atomically increments Progress.activeTimeSeconds
 *   4. Provides per-lesson and per-course seat-time summaries for audit
 */
@Injectable()
export class SeatTimeService {
  private readonly logger = new Logger(SeatTimeService.name);
  private static readonly MAX_HEARTBEAT_ACTIVE_SECONDS = 120;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * Record a heartbeat pulse from the client.
   * Atomically adds clamped active seconds to the Progress record.
   */
  async recordHeartbeat(dto: SeatTimeHeartbeatDto, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    // 1. Clamp active seconds to prevent client-side inflation
    const clampedActive = Math.min(
      Math.max(dto.activeSeconds, 0),
      SeatTimeService.MAX_HEARTBEAT_ACTIVE_SECONDS,
    );

    // 2. If client reports more idle time than active time, reject
    if (dto.idleSeconds && dto.idleSeconds > clampedActive) {
      this.logger.warn(
        `Suspicious heartbeat from ${user.firebaseId}: idle ${dto.idleSeconds}s > active ${clampedActive}s — recording 0s`,
      );
      return {
        accepted: false,
        reason: 'Idle time exceeds active time',
        activeSecondsRecorded: 0,
      };
    }

    // 3. Net active time = clamped active minus idle
    const netActive = clampedActive - (dto.idleSeconds || 0);
    if (netActive <= 0) {
      return {
        accepted: true,
        activeSecondsRecorded: 0,
        totalActiveTimeSeconds: 0,
      };
    }

    // 4. Upsert Progress record and atomically increment activeTimeSeconds
    const progress = await this.prisma.progress.upsert({
      where: {
        // Use a findFirst fallback since Progress doesn't have a compound unique
        id: await this.findOrCreateProgressId(
          user.firebaseId,
          dto.courseId,
          dto.lessonId,
          dto.contentId,
        ),
      },
      update: {
        activeTimeSeconds: { increment: netActive },
        updatedAt: new Date(),
      },
      create: {
        userId: user.firebaseId,
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        contentId: dto.contentId || null,
        status: 'IN_PROGRESS',
        activeTimeSeconds: netActive,
      },
    });

    this.logger.debug(
      `Heartbeat recorded: user=${user.firebaseId} lesson=${dto.lessonId} +${netActive}s → total=${progress.activeTimeSeconds}s`,
    );

    return {
      accepted: true,
      activeSecondsRecorded: netActive,
      totalActiveTimeSeconds: progress.activeTimeSeconds,
    };
  }

  /**
   * Get seat-time summary per lesson for a course.
   * Used by instructors and auditors to verify WAC 246-841A compliance.
   */
  async getCourseSummary(
    courseId: number,
    targetUserId: string | undefined,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);

    // Students can only view their own data
    const userId = targetUserId || user.firebaseId;
    if (
      userId !== user.firebaseId &&
      !['INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR'].includes(profile.role)
    ) {
      throw new ForbiddenException(
        'Only instructors, admins, or auditors can view other students\' seat-time data.',
      );
    }

    const records = await this.prisma.progress.findMany({
      where: {
        courseId,
        userId,
        lessonId: { not: null },
      },
      select: {
        lessonId: true,
        activeTimeSeconds: true,
        status: true,
        updatedAt: true,
        lesson: {
          select: {
            id: true,
            title: true,
            isCreditHour: true,
            isOrientationLesson: true,
          },
        },
      },
      orderBy: { lessonId: 'asc' },
    });

    const totalSeconds = records.reduce(
      (sum, r) => sum + r.activeTimeSeconds,
      0,
    );
    const creditHourSeconds = records
      .filter((r) => r.lesson?.isCreditHour)
      .reduce((sum, r) => sum + r.activeTimeSeconds, 0);

    return {
      courseId,
      userId,
      totalActiveTimeSeconds: totalSeconds,
      totalActiveTimeMinutes: Math.round(totalSeconds / 60),
      creditHourActiveTimeSeconds: creditHourSeconds,
      creditHourActiveTimeMinutes: Math.round(creditHourSeconds / 60),
      lessons: records.map((r) => ({
        lessonId: r.lessonId,
        lessonTitle: r.lesson?.title,
        isCreditHour: r.lesson?.isCreditHour,
        activeTimeSeconds: r.activeTimeSeconds,
        activeTimeMinutes: Math.round(r.activeTimeSeconds / 60),
        status: r.status,
        lastActivity: r.updatedAt,
      })),
    };
  }

  /**
   * Get seat-time for a specific lesson.
   */
  async getLessonSeatTime(
    courseId: number,
    lessonId: number,
    targetUserId: string | undefined,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);
    const userId = targetUserId || user.firebaseId;

    if (
      userId !== user.firebaseId &&
      !['INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR'].includes(profile.role)
    ) {
      throw new ForbiddenException(
        'Only instructors, admins, or auditors can view other students\' seat-time data.',
      );
    }

    const record = await this.prisma.progress.findFirst({
      where: { courseId, lessonId, userId },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            isCreditHour: true,
            module: { select: { id: true, title: true, track: true } },
          },
        },
      },
    });

    if (!record) {
      return {
        courseId,
        lessonId,
        userId,
        activeTimeSeconds: 0,
        activeTimeMinutes: 0,
        status: 'NOT_STARTED',
      };
    }

    return {
      courseId,
      lessonId,
      userId,
      activeTimeSeconds: record.activeTimeSeconds,
      activeTimeMinutes: Math.round(record.activeTimeSeconds / 60),
      status: record.status,
      lastActivity: record.updatedAt,
      lesson: record.lesson,
    };
  }

  /**
   * Cohort-wide seat-time report (instructors & auditors only).
   * Returns aggregate active time per student for all credit-hour lessons.
   */
  async getCohortReport(cohortId: number, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR'].includes(profile.role)) {
      throw new ForbiddenException(
        'Only instructors, admins, or auditors can view cohort seat-time reports.',
      );
    }

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          select: { userId: true },
        },
      },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    const studentIds = cohort.enrollments.map((e) => e.userId);

    const records = await this.prisma.progress.findMany({
      where: {
        courseId: cohort.courseId,
        userId: { in: studentIds },
        lessonId: { not: null },
        lesson: { isCreditHour: true },
      },
      select: {
        userId: true,
        activeTimeSeconds: true,
      },
    });

    // Aggregate per student
    const studentMap = new Map<string, number>();
    for (const r of records) {
      studentMap.set(
        r.userId,
        (studentMap.get(r.userId) || 0) + r.activeTimeSeconds,
      );
    }

    const students = studentIds.map((uid) => ({
      userId: uid,
      totalActiveTimeSeconds: studentMap.get(uid) || 0,
      totalActiveTimeMinutes: Math.round((studentMap.get(uid) || 0) / 60),
    }));

    return {
      cohortId,
      courseId: cohort.courseId,
      totalStudents: studentIds.length,
      students: students.sort(
        (a, b) => a.totalActiveTimeSeconds - b.totalActiveTimeSeconds,
      ),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrCreateProgressId(
    userId: string,
    courseId: number,
    lessonId: number,
    contentId?: number,
  ): Promise<number> {
    const existing = await this.prisma.progress.findFirst({
      where: {
        userId,
        courseId,
        lessonId,
        contentId: contentId || null,
      },
      select: { id: true },
    });

    if (existing) return existing.id;

    // Create a new progress record and return its ID
    const created = await this.prisma.progress.create({
      data: {
        userId,
        courseId,
        lessonId,
        contentId: contentId || null,
        status: 'IN_PROGRESS',
        activeTimeSeconds: 0,
      },
    });
    return created.id;
  }
}
