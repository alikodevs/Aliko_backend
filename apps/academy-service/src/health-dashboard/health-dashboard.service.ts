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

  private getWeekNumber(startDate: Date, targetDate: Date): number {
    const diffMs = targetDate.getTime() - startDate.getTime();
    return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);
  }

  private getProgramPhaseForWeek(weekNumber: number, isHighSchoolTenMonth: boolean): string {
    if (isHighSchoolTenMonth) {
      if (weekNumber === 1) return 'Orientation + Unit 1';
      if (weekNumber <= 28) return 'Units 1–9 theory + lab days';
      if (weekNumber <= 30) return 'Mock skills #1';
      if (weekNumber <= 37) return 'Clinical 40 h (5 × 8-h shifts)';
      if (weekNumber <= 38) return 'Mock skills #2';
      return 'Exam prep · certificate';
    }
    if (weekNumber === 1) return 'Orientation + Unit 1';
    if (weekNumber <= 8) return 'Units 1–9 theory + lab days';
    if (weekNumber === 9) return 'Mock skills #1';
    if (weekNumber <= 11) return 'Clinical 40 h (5 × 8-h shifts)';
    if (weekNumber === 12) return 'Clinical + Mock skills #2';
    return 'Exam prep · certificate';
  }

  private getDefaultPacedWeekForModule(
    mod: { isOrientationModule: boolean; unitNumber: number | null; title: string },
    index: number,
  ): number {
    if (mod.isOrientationModule || mod.unitNumber === 0) return 1;
    if (mod.unitNumber && mod.unitNumber >= 1 && mod.unitNumber <= 9) {
      // Spread Units 1-9 across Weeks 1-8
      return Math.min(8, Math.max(1, Math.ceil((mod.unitNumber * 8) / 9)));
    }
    if (mod.unitNumber === 10 || /mock/i.test(mod.title)) return 9;
    if (mod.unitNumber === 11 || /clinical/i.test(mod.title)) return 10;
    if (mod.unitNumber === 12 || /exam|prep|cert/i.test(mod.title)) return 13;
    return Math.min(13, index + 1);
  }

  /**
   * S9: Health Cohort Schedule (13-week timeline, paced due dates, live Q&A, lab days, clinical shifts)
   */
  async getCohortSchedule(cohortId: number, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
    const isStaff = ['INSTRUCTOR', 'ADMIN', 'COURSE_MANAGER', 'COMMISSION_AUDITOR'].includes(profile.role);

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        course: {
          include: {
            modules: {
              orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
              include: {
                lessons: {
                  orderBy: [{ order: 'asc' }, { id: 'asc' }],
                  select: { id: true, title: true, type: true, dueDate: true, order: true, estimatedHours: true },
                },
                discussionTopics: {
                  select: { id: true, title: true, dueDate: true },
                },
              },
            },
          },
        },
        teachingSchedules: {
          orderBy: { startTime: 'asc' },
          include: {
            profile: {
              select: { userId: true, role: true, specialization: true, bio: true },
            },
          },
        },
        clinicalShifts: {
          orderBy: { shiftDate: 'asc' },
          include: {
            instructor: {
              select: { userId: true, role: true, specialization: true, bio: true },
            },
            studentRoster: {
              select: { userId: true, hoursCompleted: true, passed: true, signedBy: true },
            },
          },
        },
        enrollments: {
          where: { status: 'ACTIVE' },
          select: { userId: true, cohortRole: true },
        },
      },
    });

    if (!cohort) throw new NotFoundException(`Cohort ${cohortId} not found`);

    if (!isStaff) {
      const isEnrolled = cohort.enrollments.some((e) => e.userId === user.firebaseId);
      if (!isEnrolled) {
        throw new ForbiddenException('You are not enrolled in this cohort.');
      }
    }

    const activeStudentCount = cohort.enrollments.filter((e) => e.cohortRole !== 'TEACHING_ASSISTANT').length;
    const instructorCount = Math.max(1, cohort.assignedInstructorIds?.length || 1);
    const ratioNumeric = Number((activeStudentCount / instructorCount).toFixed(1));
    const isWithinLabRatio = activeStudentCount <= instructorCount * 10;

    // Student progress overlay
    const progressRecords = await this.prisma.progress.findMany({
      where: { userId: user.firebaseId, courseId: cohort.courseId },
      select: { lessonId: true, status: true, contentId: true },
    });
    const completedLessonIds = new Set(
      progressRecords
        .filter((p) => p.lessonId && p.status === 'COMPLETED' && !p.contentId)
        .map((p) => p.lessonId!),
    );

    const totalWeeks = cohort.isHighSchoolTenMonth ? 40 : 13;
    const msPerDay = 24 * 60 * 60 * 1000;

    const pacedUnitSchedule = cohort.course.modules.map((m, idx) => {
      const defaultWeek = this.getDefaultPacedWeekForModule(m, idx);
      const effectiveOpenDate =
        m.scheduledOpenDate ?? new Date(cohort.startDate.getTime() + (defaultWeek - 1) * 7 * msPerDay);
      const openWeekNumber = Math.min(totalWeeks, this.getWeekNumber(cohort.startDate, effectiveOpenDate));
      const defaultUnitDueDate = new Date(
        cohort.startDate.getTime() + (openWeekNumber * 7 - 1) * msPerDay,
      );

      const totalLessons = m.lessons.length;
      const completedLessons = m.lessons.filter((l) => completedLessonIds.has(l.id)).length;

      const lessons = m.lessons.map((l) => {
        const effectiveDue = l.dueDate ?? defaultUnitDueDate;
        return {
          id: l.id,
          title: l.title,
          type: l.type,
          order: l.order,
          estimatedHours: l.estimatedHours,
          dueDate: l.dueDate,
          pacedDueDate: effectiveDue,
          weekNumber: Math.min(totalWeeks, this.getWeekNumber(cohort.startDate, effectiveDue)),
          completed: completedLessonIds.has(l.id),
        };
      });

      const discussions = m.discussionTopics.map((d) => {
        const effectiveDue = d.dueDate ?? defaultUnitDueDate;
        return {
          id: d.id,
          title: d.title,
          dueDate: d.dueDate,
          pacedDueDate: effectiveDue,
          weekNumber: Math.min(totalWeeks, this.getWeekNumber(cohort.startDate, effectiveDue)),
        };
      });

      return {
        moduleId: m.id,
        unitNumber: m.unitNumber,
        title: m.title,
        isOrientationModule: m.isOrientationModule,
        scheduledOpenDate: m.scheduledOpenDate,
        effectiveOpenDate,
        weekNumber: openWeekNumber,
        targetTheoryHours: m.targetTheoryHours,
        targetLabHours: m.targetLabHours,
        totalLessons,
        completedLessons,
        percentComplete: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        isCompleted: totalLessons > 0 && completedLessons === totalLessons,
        lessons,
        discussions,
        dueItems: lessons.filter((l) => l.dueDate !== null),
      };
    });

    const liveAndLabSessions = cohort.teachingSchedules.map((s) => {
      const weekNumber = this.getWeekNumber(cohort.startDate, s.startTime);
      const isLab = s.type === 'WORKSHOP';
      const isLiveQa = s.type === 'LIVE' || s.type === 'Q_AND_A' || s.type === 'OFFICE_HOURS';
      return {
        ...s,
        weekNumber,
        sessionCategory: isLab ? 'LAB_DAY' : isLiveQa ? 'LIVE_QA' : 'RECORDING',
        instructorProfile: s.profile,
        ...(isLiveQa
          ? {
              liveCapacity: {
                enrolledCount: activeStudentCount,
                maxLiveCapacity: cohort.maxLiveCapacity,
                spotsRemaining: Math.max(0, cohort.maxLiveCapacity - activeStudentCount),
                isFull: activeStudentCount >= cohort.maxLiveCapacity,
              },
              recordingPolicy:
                'Recordings post within 24 h and do not count as seat-time unless watched in the LMS.',
            }
          : {}),
        ...(isLab
          ? {
              labRatio: {
                enrolledStudents: activeStudentCount,
                instructorCount,
                currentRatio: `${ratioNumeric}:1`,
                maxAllowedRatio: '10:1',
                isWithinRatio: isWithinLabRatio,
              },
            }
          : {}),
      };
    });

    const clinicalShifts = cohort.clinicalShifts.map((shift) => {
      const weekNumber = this.getWeekNumber(cohort.startDate, shift.shiftDate);
      const myAttendance = shift.studentRoster.find((a) => a.userId === user.firebaseId) || null;
      return {
        id: shift.id,
        cohortId: shift.cohortId,
        facilityName: shift.facilityName,
        instructorId: shift.instructorId,
        instructorProfile: shift.instructor,
        shiftDate: shift.shiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        hoursCredited: shift.hoursCredited,
        weekNumber,
        enrolledStudents: shift.studentRoster.length,
        maxRatio: '10:1',
        myAttendance,
      };
    });

    const totalScheduledClinicalHours = clinicalShifts.reduce((sum, s) => sum + (s.hoursCredited || 0), 0);
    const completedClinicalHours = clinicalShifts.reduce(
      (sum, s) => sum + (s.myAttendance?.passed ? s.myAttendance.hoursCompleted : 0),
      0,
    );

    const weeklyCalendar = Array.from({ length: totalWeeks }, (_, idx) => {
      const weekNumber = idx + 1;
      const weekStart = new Date(cohort.startDate.getTime() + idx * 7 * msPerDay);
      const weekEnd = new Date(weekStart.getTime() + 6 * msPerDay);

      return {
        weekNumber,
        startDate: weekStart,
        endDate: weekEnd,
        programPhase: this.getProgramPhaseForWeek(weekNumber, cohort.isHighSchoolTenMonth),
        unitsOpening: pacedUnitSchedule
          .filter((u) => u.weekNumber === weekNumber)
          .map((u) => ({
            moduleId: u.moduleId,
            unitNumber: u.unitNumber,
            title: u.title,
            isCompleted: u.isCompleted,
            percentComplete: u.percentComplete,
          })),
        dueItems: pacedUnitSchedule.flatMap((u) =>
          u.lessons
            .filter((l) => l.weekNumber === weekNumber)
            .map((l) => ({
              moduleId: u.moduleId,
              unitNumber: u.unitNumber,
              lessonId: l.id,
              title: l.title,
              type: l.type,
              dueDate: l.pacedDueDate,
              completed: l.completed,
            })),
        ),
        liveSessions: liveAndLabSessions.filter(
          (s) => s.weekNumber === weekNumber && s.sessionCategory !== 'LAB_DAY',
        ),
        labDays: liveAndLabSessions.filter(
          (s) => s.weekNumber === weekNumber && s.sessionCategory === 'LAB_DAY',
        ),
        clinicalShifts: clinicalShifts.filter((c) => c.weekNumber === weekNumber),
      };
    });

    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      courseId: cohort.courseId,
      courseTitle: cohort.course.title,
      domain: cohort.course.domain,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      totalWeeks,
      windowStatus: this.compute90DayWindow(cohort.startDate, cohort.isHighSchoolTenMonth),
      capacityAndRatios: {
        activeStudentCount,
        maxCapacity: cohort.maxCapacity,
        maxLiveCapacity: cohort.maxLiveCapacity,
        instructorCount,
        currentStudentToInstructorRatio: `${ratioNumeric}:1`,
        maxLabAndClinicalRatio: '10:1',
        isWithinLabRatio,
      },
      clinicalSummary: {
        totalScheduledHours: totalScheduledClinicalHours,
        completedHours: completedClinicalHours,
        targetHours: 40,
      },
      maxLiveCapacity: cohort.maxLiveCapacity,
      pacedUnitSchedule,
      liveAndLabSessions,
      clinicalShifts,
      weeklyCalendar,
    };
  }
}
