import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { HealthCompliancePolicy } from '../common/policies/health-compliance.policy';
import { CourseDomain } from '@prisma/client/academy';

@Injectable()
export class HealthDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  private compute90DayWindow(startDate: Date, isHighSchoolTenMonth: boolean) {
    const maxDays = isHighSchoolTenMonth ? 300 : 90;
    const deadline = new Date(startDate.getTime() + maxDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    let alertState: 'NORMAL' | 'WARNING_21D' | 'CRITICAL_7D' | 'EXPIRED' = 'NORMAL';
    if (daysRemaining <= 0) alertState = 'EXPIRED';
    else if (daysRemaining <= 7) alertState = 'CRITICAL_7D';
    else if (daysRemaining <= 21) alertState = 'WARNING_21D';

    return {
      startDate,
      deadline,
      maxWindowDays: maxDays,
      daysRemaining: Math.max(0, daysRemaining),
      alertState,
    };
  }

  /**
   * S1: Unified Health Student Dashboard
   */
  async getStudentDashboard(user: AuthenticatedUser, courseId?: number) {
    await this.userService.getOrCreateProfile(user);

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.firebaseId,
        course: { domain: CourseDomain.HEALTH },
        ...(courseId ? { courseId } : {}),
      },
      include: {
        course: true,
        cohort: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    if (!enrollment) {
      throw new NotFoundException('No active Health program enrollment found.');
    }

    const profile = HealthCompliancePolicy.getComplianceProfile(enrollment.course)!;
    const activeCourseId = enrollment.courseId;

    const [modules, progressRecords, admissionsApp, skillCheckoffs, clinicalAttendances] =
      await Promise.all([
        this.prisma.module.findMany({
          where: { courseId: activeCourseId },
          orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: { contents: { select: { id: true, title: true, type: true, durationSeconds: true } } },
            },
            discussionTopics: { select: { id: true, title: true, dueDate: true } },
            exercises: { select: { id: true, title: true, type: true, points: true } },
          },
        }),
        this.prisma.progress.findMany({
          where: { userId: user.firebaseId, courseId: activeCourseId },
          orderBy: { updatedAt: 'desc' },
        }),
        enrollment.cohortId
          ? this.prisma.studentAdmissionsApplication.findUnique({
              where: { userId_cohortId: { userId: user.firebaseId, cohortId: enrollment.cohortId } },
            })
          : null,
        this.prisma.skillCheckoff.findMany({
          where: { userId: user.firebaseId, passed: true },
          distinct: ['skillId'],
        }),
        this.prisma.clinicalShiftAttendance.findMany({
          where: { userId: user.firebaseId, passed: true },
          include: { shift: true },
        }),
      ]);

    const verifiedTheorySeconds = progressRecords.reduce((sum, p) => sum + (p.activeTimeSeconds || 0), 0);
    const verifiedTheoryHours = Number((verifiedTheorySeconds / 3600).toFixed(2));
    const completedClinicalHours = clinicalAttendances.reduce(
      (sum, a) => sum + (a.shift?.hoursCredited || 0),
      0,
    );

    const completedLessonIds = new Set(
      progressRecords.filter((p) => p.lessonId && p.status === 'COMPLETED' && !p.contentId).map((p) => p.lessonId!),
    );

    // Continue where you left off
    let continueWhereYouLeftOff: any = null;
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!completedLessonIds.has(lesson.id)) {
          continueWhereYouLeftOff = {
            moduleId: mod.id,
            moduleTitle: mod.title,
            unitNumber: mod.unitNumber,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonType: lesson.type,
          };
          break;
        }
      }
      if (continueWhereYouLeftOff) break;
    }

    // Due this week (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueThisWeek = modules.flatMap((mod) =>
      mod.lessons
        .filter((l) => l.dueDate && l.dueDate >= now && l.dueDate <= nextWeek)
        .map((l) => ({
          lessonId: l.id,
          title: l.title,
          type: l.type,
          dueDate: l.dueDate,
          moduleTitle: mod.title,
          completed: completedLessonIds.has(l.id),
        })),
    );

    // Course path
    const coursePath = modules.map((mod) => {
      const totalLessons = mod.lessons.length;
      const doneLessons = mod.lessons.filter((l) => completedLessonIds.has(l.id)).length;
      return {
        moduleId: mod.id,
        unitNumber: mod.unitNumber,
        title: mod.title,
        isOrientationModule: mod.isOrientationModule,
        scheduledOpenDate: mod.scheduledOpenDate,
        totalLessons,
        completedLessons: doneLessons,
        percentComplete: totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0,
      };
    });

    // Daily study activity (grouped by YYYY-MM-DD)
    const activityMap = new Map<string, number>();
    for (const p of progressRecords) {
      if (p.activeTimeSeconds > 0) {
        const day = p.updatedAt.toISOString().slice(0, 10);
        activityMap.set(day, (activityMap.get(day) || 0) + p.activeTimeSeconds);
      }
    }
    const studyActivity = Array.from(activityMap.entries())
      .map(([date, seconds]) => ({ date, activeMinutes: Math.round(seconds / 60) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        domain: enrollment.course.domain,
        regulatoryBody: enrollment.course.regulatoryBody,
      },
      cohort: enrollment.cohort
        ? {
            id: enrollment.cohort.id,
            name: enrollment.cohort.name,
            startDate: enrollment.cohort.startDate,
            endDate: enrollment.cohort.endDate,
          }
        : null,
      windowStatus: enrollment.cohort
        ? this.compute90DayWindow(enrollment.cohort.startDate, enrollment.cohort.isHighSchoolTenMonth)
        : null,
      hoursProgress: {
        theory: { completedHours: verifiedTheoryHours, targetHours: profile.requiredTheoryHours },
        lab: { passedSkills: skillCheckoffs.length, totalSkills: 22, targetHours: profile.requiredLabHours },
        clinical: { completedHours: completedClinicalHours, targetHours: profile.requiredClinicalHours },
      },
      orientationStatus: {
        orientationCompleted: admissionsApp?.orientationCompleted ?? false,
        agreementSigned: admissionsApp?.agreementSigned ?? false,
        techCheckPassed: admissionsApp?.techCheckPassed ?? false,
      },
      continueWhereYouLeftOff,
      coursePath,
      dueThisWeek,
      studyActivity,
    };
  }

  /**
   * S8: Unit-by-Unit Grade Summary
   */
  async getUnitGradeSummary(targetUserId: string, requestingUser: AuthenticatedUser, courseId?: number) {
    const profile = await this.userService.getOrCreateProfile(requestingUser);
    const isStaff = ['INSTRUCTOR', 'ADMIN', 'COURSE_MANAGER', 'COMMISSION_AUDITOR'].includes(profile.role);
    if (!isStaff && targetUserId !== requestingUser.firebaseId) {
      throw new ForbiddenException('You can only view your own unit grade summary.');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: targetUserId,
        course: { domain: CourseDomain.HEALTH },
        ...(courseId ? { courseId } : {}),
      },
      include: { course: true },
    });
    if (!enrollment) throw new NotFoundException('No Health course enrollment found for this student.');

    const [modules, submissions, discussionPosts, progressRecords, skillCheckoffs] = await Promise.all([
      this.prisma.module.findMany({
        where: { courseId: enrollment.courseId, isOrientationModule: false },
        orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
        include: {
          exercises: { select: { id: true, type: true, points: true, title: true, isProctored: true } },
          discussionTopics: { select: { id: true, maxPoints: true, title: true } },
        },
      }),
      this.prisma.exerciseSubmission.findMany({
        where: { userId: targetUserId },
      }),
      this.prisma.discussionPost.findMany({
        where: { userId: targetUserId, parentId: null },
        include: { grade: true },
      }),
      this.prisma.progress.findMany({
        where: { userId: targetUserId, courseId: enrollment.courseId },
      }),
      this.prisma.skillCheckoff.findMany({
        where: { userId: targetUserId, passed: true },
        include: { skill: { select: { taughtInUnit: true } } },
      }),
    ]);

    const subMap = new Map(submissions.map((s) => [s.exerciseId, s]));
    const postByTopic = new Map(discussionPosts.map((p) => [p.topicId, p]));

    const units = modules.map((mod) => {
      const pyramidEx = mod.exercises.find((e) => e.type === 'MASLOW_PYRAMID');
      const storyEx = mod.exercises.find((e) => e.type === 'STORY_ACTIVITY');
      const quizEx = mod.exercises.find((e) => e.type === 'MULTIPLE_CHOICE' || e.isProctored);
      const topic = mod.discussionTopics[0];

      const pyramidSub = pyramidEx ? subMap.get(pyramidEx.id) : null;
      const storySub = storyEx ? subMap.get(storyEx.id) : null;
      const quizSub = quizEx ? subMap.get(quizEx.id) : null;
      const discPost = topic ? postByTopic.get(topic.id) : null;

      const unitSeconds = progressRecords
        .filter((p) => p.moduleId === mod.id)
        .reduce((sum, p) => sum + (p.activeTimeSeconds || 0), 0);

      const unitLabel = mod.unitNumber ? `Unit ${mod.unitNumber}` : mod.title;
      const passedSkillsInUnit = skillCheckoffs.filter(
        (sc) => sc.skill?.taughtInUnit && sc.skill.taughtInUnit === unitLabel,
      ).length;

      return {
        moduleId: mod.id,
        unitNumber: mod.unitNumber,
        title: mod.title,
        pyramid: pyramidEx ? { status: pyramidSub?.status || 'NOT_STARTED', score: pyramidSub?.score ?? null, maxPoints: pyramidEx.points } : null,
        story: storyEx ? { status: storySub?.status || 'NOT_STARTED', score: storySub?.score ?? null, maxPoints: storyEx.points } : null,
        discussion: topic ? { posted: Boolean(discPost), score: discPost?.grade?.score ?? null, maxPoints: topic.maxPoints } : null,
        quiz: quizEx ? { status: quizSub?.status || 'NOT_STARTED', score: quizSub?.score ?? null, maxPoints: quizEx.points } : null,
        labSkillsPassed: passedSkillsInUnit,
        verifiedTheoryHours: Number((unitSeconds / 3600).toFixed(2)),
        targetTheoryHours: mod.targetTheoryHours,
      };
    });

    return {
      userId: targetUserId,
      courseId: enrollment.courseId,
      courseTitle: enrollment.course.title,
      passingThresholdPercent: 80,
      units,
    };
  }

  /**
   * S9: Health Cohort Schedule (13-week timeline, paced due dates, live Q&A, lab days, clinical shifts)
   */
  async getCohortSchedule(cohortId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        course: {
          include: {
            modules: {
              orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
              include: {
                lessons: {
                  where: { dueDate: { not: null } },
                  select: { id: true, title: true, type: true, dueDate: true },
                },
              },
            },
          },
        },
        teachingSchedules: { orderBy: { startTime: 'asc' } },
        clinicalShifts: { orderBy: { shiftDate: 'asc' } },
      },
    });

    if (!cohort) throw new NotFoundException(`Cohort ${cohortId} not found`);

    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      courseTitle: cohort.course.title,
      domain: cohort.course.domain,
      windowStatus: this.compute90DayWindow(cohort.startDate, cohort.isHighSchoolTenMonth),
      maxLiveCapacity: cohort.maxLiveCapacity,
      pacedUnitSchedule: cohort.course.modules.map((m) => ({
        moduleId: m.id,
        unitNumber: m.unitNumber,
        title: m.title,
        scheduledOpenDate: m.scheduledOpenDate,
        targetTheoryHours: m.targetTheoryHours,
        targetLabHours: m.targetLabHours,
        dueItems: m.lessons,
      })),
      liveAndLabSessions: cohort.teachingSchedules,
      clinicalShifts: cohort.clinicalShifts,
    };
  }
}
