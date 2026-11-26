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

  /**
   * I1: Instructor Console Dashboard
   */
  async getInstructorDashboard(user: AuthenticatedUser, cohortId?: number) {
    const profile = await this.userService.getOrCreateProfile(user);
    const isStaff = ['INSTRUCTOR', 'ADMIN', 'COURSE_MANAGER', 'COMMISSION_AUDITOR'].includes(profile.role);
    if (!isStaff) {
      throw new ForbiddenException('Only instructors and staff can access the instructor console.');
    }

    const cohort = cohortId
      ? await this.prisma.cohort.findUnique({
          where: { id: cohortId },
          include: {
            course: {
              include: {
                modules: {
                  where: { isOrientationModule: false, unitNumber: { gte: 1, lte: 9 } },
                  orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
                  include: {
                    exercises: { select: { id: true, type: true, isProctored: true, passingScorePercent: true } },
                  },
                },
              },
            },
            enrollments: {
              where: { status: 'ACTIVE', cohortRole: 'STUDENT' },
              select: { userId: true, enrolledAt: true },
            },
            teachingSchedules: {
              where: { type: 'WORKSHOP', startTime: { gte: new Date() } },
              orderBy: { startTime: 'asc' },
              take: 5,
            },
          },
        })
      : await this.prisma.cohort.findFirst({
          where: {
            course: { domain: CourseDomain.HEALTH },
            ...(profile.role === 'INSTRUCTOR'
              ? {
                  OR: [
                    { assignedInstructorIds: { has: user.firebaseId } },
                    { course: { instructorId: user.firebaseId } },
                  ],
                }
              : {}),
          },
          orderBy: { startDate: 'desc' },
          include: {
            course: {
              include: {
                modules: {
                  where: { isOrientationModule: false, unitNumber: { gte: 1, lte: 9 } },
                  orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
                  include: {
                    exercises: { select: { id: true, type: true, isProctored: true, passingScorePercent: true } },
                  },
                },
              },
            },
            enrollments: {
              where: { status: 'ACTIVE', cohortRole: 'STUDENT' },
              select: { userId: true, enrolledAt: true },
            },
            teachingSchedules: {
              where: { type: 'WORKSHOP', startTime: { gte: new Date() } },
              orderBy: { startTime: 'asc' },
              take: 5,
            },
          },
        });

    if (!cohort) {
      throw new NotFoundException('No active Health cohort found for instructor console.');
    }

    const studentIds = cohort.enrollments.map((e) => e.userId);
    const totalStudents = studentIds.length;
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const [
      pendingSubmissions,
      ungradedDiscussions,
      unitSubmissions,
      recentProgress,
      proctoringFlags,
    ] = await Promise.all([
      this.prisma.exerciseSubmission.findMany({
        where: {
          status: 'PENDING_REVIEW',
          exercise: { module: { courseId: cohort.courseId } },
          ...(studentIds.length > 0 ? { userId: { in: studentIds } } : {}),
        },
        select: { id: true, updatedAt: true },
      }),
      this.prisma.discussionPost.findMany({
        where: {
          parentId: null,
          grade: null,
          topic: { module: { courseId: cohort.courseId } },
          ...(studentIds.length > 0 ? { userId: { in: studentIds } } : {}),
        },
        select: { id: true, createdAt: true },
      }),
      this.prisma.exerciseSubmission.findMany({
        where: {
          status: 'GRADED',
          exercise: { module: { courseId: cohort.courseId } },
          ...(studentIds.length > 0 ? { userId: { in: studentIds } } : {}),
        },
        select: { userId: true, exerciseId: true, score: true },
      }),
      this.prisma.progress.findMany({
        where: {
          courseId: cohort.courseId,
          activeTimeSeconds: { gt: 0 },
          ...(studentIds.length > 0 ? { userId: { in: studentIds } } : {}),
        },
        select: { userId: true, updatedAt: true },
      }),
      this.prisma.examSession.findMany({
        where: {
          exercise: { module: { courseId: cohort.courseId } },
          ...(studentIds.length > 0 ? { userId: { in: studentIds } } : {}),
          tabBlurCount: { gt: 0 },
        },
        select: { id: true, userId: true, exerciseId: true, tabBlurCount: true, startTime: true },
        orderBy: { startTime: 'desc' },
        take: 10,
      }),
    ]);

    const overdueSubmissions = pendingSubmissions.filter((s) => s.updatedAt < twoDaysAgo).length;
    const overdueDiscussions = ungradedDiscussions.filter((d) => d.createdAt < twoDaysAgo).length;

    // 5-day inactivity pacing alerts
    const lastActiveByStudent = new Map<string, Date>();
    for (const p of recentProgress) {
      const prev = lastActiveByStudent.get(p.userId);
      if (!prev || p.updatedAt > prev) lastActiveByStudent.set(p.userId, p.updatedAt);
    }
    const pacingAlertStudentIds = studentIds.filter((uid) => {
      const last = lastActiveByStudent.get(uid);
      return !last || last < fiveDaysAgo;
    });

    // Unit-by-unit quiz pass counts
    const unitProgress = cohort.course.modules.map((mod) => {
      const quizEx = mod.exercises.find((e) => e.type === 'MULTIPLE_CHOICE' || e.isProctored);
      const passThreshold = quizEx?.passingScorePercent ?? 80;
      const passedUsers = new Set(
        quizEx
          ? unitSubmissions
              .filter((s) => s.exerciseId === quizEx.id && s.score >= passThreshold)
              .map((s) => s.userId)
          : [],
      );
      return {
        moduleId: mod.id,
        unitNumber: mod.unitNumber,
        title: mod.title,
        studentsPassedQuiz: passedUsers.size,
        totalStudents,
        passPercent: totalStudents > 0 ? Math.round((passedUsers.size / totalStudents) * 100) : 0,
      };
    });

    return {
      course: {
        id: cohort.course.id,
        title: cohort.course.title,
        version: cohort.course.version,
        isLocked: cohort.course.isLocked,
        status: cohort.course.status,
        isStateApproved: cohort.course.isStateApproved,
        domain: cohort.course.domain,
      },
      cohort: {
        id: cohort.id,
        name: cohort.name,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        enrolledCount: totalStudents,
        maxTheoryCap: 30,
        isWithinTheoryCap: totalStudents <= 30,
      },
      windowStatus: this.compute90DayWindow(cohort.startDate, cohort.isHighSchoolTenMonth),
      gradingQueue: {
        pendingExercisesCount: pendingSubmissions.length,
        pendingDiscussionsCount: ungradedDiscussions.length,
        totalPending: pendingSubmissions.length + ungradedDiscussions.length,
        overdueCount: overdueSubmissions + overdueDiscussions,
        targetSlaDays: 2,
      },
      unitProgress,
      needsAttention: {
        pacingAlertCount: pacingAlertStudentIds.length,
        pacingAlertStudentIds,
        proctoringFlagsCount: proctoringFlags.length,
        proctoringFlags,
        upcomingLabDays: cohort.teachingSchedules,
      },
    };
  }

  /**
   * I8: Unified Submissions Grading Queue (oldest first, 2-business-day SLA, rubrics attached)
   */
  async getSubmissionsQueue(user: AuthenticatedUser, courseId?: number) {
    const profile = await this.userService.getOrCreateProfile(user);
    const isStaff = ['INSTRUCTOR', 'ADMIN', 'COURSE_MANAGER'].includes(profile.role);
    if (!isStaff) {
      throw new ForbiddenException('Only instructors and admins can access the grading queue.');
    }

    const [exerciseSubs, discussionPosts] = await Promise.all([
      this.prisma.exerciseSubmission.findMany({
        where: {
          status: 'PENDING_REVIEW',
          exercise: {
            module: {
              course: {
                domain: CourseDomain.HEALTH,
                ...(courseId ? { id: courseId } : {}),
              },
            },
          },
        },
        include: {
          exercise: {
            select: { id: true, title: true, type: true, points: true, rubricId: true, moduleId: true },
          },
          profile: { select: { userId: true, role: true } },
        },
        orderBy: { updatedAt: 'asc' },
      }),
      this.prisma.discussionPost.findMany({
        where: {
          parentId: null,
          grade: null,
          topic: {
            module: {
              course: {
                domain: CourseDomain.HEALTH,
                ...(courseId ? { id: courseId } : {}),
              },
            },
          },
        },
        include: {
          topic: {
            select: { id: true, title: true, maxPoints: true, rubricId: true, rubric: true, moduleId: true },
          },
          profile: { select: { userId: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const queue = [
      ...exerciseSubs.map((s) => {
        const daysWaiting = Number(((now - s.updatedAt.getTime()) / dayMs).toFixed(1));
        return {
          itemType: 'EXERCISE' as const,
          submissionId: s.id,
          userId: s.userId,
          exerciseId: s.exerciseId,
          title: s.exercise.title,
          activityType: s.exercise.type,
          maxPoints: s.exercise.points,
          rubricId: s.exercise.rubricId,
          answers: s.answer,
          submittedAt: s.updatedAt,
          daysWaiting,
          slaOverdue: daysWaiting > 2,
        };
      }),
      ...discussionPosts.map((p) => {
        const daysWaiting = Number(((now - p.createdAt.getTime()) / dayMs).toFixed(1));
        return {
          itemType: 'DISCUSSION' as const,
          postId: p.id,
          userId: p.userId,
          topicId: p.topicId,
          title: p.topic.title,
          activityType: 'DISCUSSION',
          maxPoints: p.topic.maxPoints,
          rubricId: p.topic.rubricId,
          rubric: p.topic.rubric,
          content: p.body,
          submittedAt: p.createdAt,
          daysWaiting,
          slaOverdue: daysWaiting > 2,
        };
      }),
    ].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());

    return {
      totalPending: queue.length,
      overdueCount: queue.filter((q) => q.slaOverdue).length,
      targetSlaDays: 2,
      queue,
    };
  }

  /**
   * I11: Cohort Compliance Audit Checklist
   */
  async getCohortComplianceAudit(cohortId: number, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
    const isStaff = ['INSTRUCTOR', 'ADMIN', 'COURSE_MANAGER', 'COMMISSION_AUDITOR'].includes(profile.role);
    if (!isStaff) {
      throw new ForbiddenException('Only instructors, admins, and auditors can view the compliance audit.');
    }

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: { include: { contents: true } },
                exercises: true,
                discussionTopics: { include: { posts: { include: { grade: true } } } },
              },
            },
          },
        },
        enrollments: { where: { status: 'ACTIVE', cohortRole: 'STUDENT' } },
        teachingSchedules: { include: { registrations: true } },
      },
    });
    if (!cohort) throw new NotFoundException(`Cohort ${cohortId} not found`);

    const studentIds = cohort.enrollments.map((e) => e.userId);
    const enrolledCount = studentIds.length;
    const instructorCount = Math.max(1, cohort.assignedInstructorIds?.length || 1);

    // Compute hours from lessons
    let theoryHours = 0;
    let labHours = 0;
    let clinicalHours = 0;
    for (const m of cohort.course.modules) {
      for (const l of m.lessons) {
        if (!l.isCreditHour) continue;
        const ht = (l.hourType || '').toUpperCase();
        if (ht === 'CLINICAL' || m.track === 'CLINICAL_IN_PERSON' || l.type === 'CLINICAL') clinicalHours += l.estimatedHours;
        else if (ht === 'LAB' || m.track === 'SKILLS_LAB_IN_PERSON' || l.type === 'SKILLS') labHours += l.estimatedHours;
        else if (ht === 'THEORY') theoryHours += l.estimatedHours;
      }
    }

    const allVideos = cohort.course.modules.flatMap((m) =>
      m.lessons.flatMap((l) => l.contents.filter((c) => c.type === 'VIDEO')),
    );
    const linkedVideos = allVideos.filter((v) => Boolean(v.url && v.url.trim().length > 0));
    const proctoredQuizzes = cohort.course.modules.flatMap((m) =>
      m.exercises.filter((e) => e.type === 'MULTIPLE_CHOICE' || e.isProctored),
    );

    const [apps, credentials] = await Promise.all([
      this.prisma.studentAdmissionsApplication.findMany({
        where: { cohortId },
        select: { userId: true, orientationCompleted: true, agreementSigned: true },
      }),
      this.prisma.instructorCredential.findMany({
        where: {
          userId: {
            in: Array.from(new Set([cohort.course.instructorId, ...(cohort.assignedInstructorIds || [])])),
          },
        },
      }),
    ]);

    const now = new Date();
    const validCredentials = credentials.filter((c) => !c.rnLicenseExpiration || c.rnLicenseExpiration > now);
    const hasRnDirector = validCredentials.some((c) => Boolean(c.rnLicenseNumber));
    const orientationCount = apps.filter((a) => a.orientationCompleted).length;
    const agreementsSignedCount = apps.filter((a) => a.agreementSigned).length;
    const durationDays = Math.round((cohort.endDate.getTime() - cohort.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const liveOverCap = cohort.teachingSchedules.some((s) => s.registrations.length > cohort.maxLiveCapacity);
    const hasInstructorInteraction = cohort.course.modules.some((m) =>
      m.discussionTopics.some((t) => t.posts.some((p) => p.grade !== null)),
    );

    const checklist = [
      {
        key: 'hours',
        label: 'Hours = 35 / 33 / 40',
        status: theoryHours >= 35 && labHours >= 33 && clinicalHours >= 40 ? 'MET' : 'NOT_MET',
        evidence: `${theoryHours.toFixed(1)}h / ${labHours.toFixed(1)}h / ${clinicalHours.toFixed(1)}h`,
      },
      {
        key: 'liveCap',
        label: 'Live cap ≤ 20',
        status: cohort.maxLiveCapacity <= 20 && !liveOverCap ? 'MET' : 'NOT_MET',
        evidence: `Max ${cohort.maxLiveCapacity} registered`,
      },
      {
        key: 'threeMonthWindow',
        label: 'Async theory finished within 3 months',
        status: cohort.isHighSchoolTenMonth || durationDays <= 90 ? 'MET' : 'NOT_MET',
        evidence: `${durationDays} calendar days`,
      },
      {
        key: 'asyncCap',
        label: 'Async cap ≤ 30 per instructor',
        status: enrolledCount <= instructorCount * 30 ? 'MET' : 'NOT_MET',
        evidence: `${enrolledCount} enrolled`,
      },
      {
        key: 'labClinicalRatio',
        label: 'Lab and clinical ratio ≤ 10:1',
        status: enrolledCount <= instructorCount * 10 ? 'MET' : 'NOT_MET',
        evidence: `${(enrolledCount / instructorCount).toFixed(1)}:1`,
      },
      {
        key: 'quizIdCheck',
        label: 'Identity check on every quiz',
        status: proctoredQuizzes.length > 0 && proctoredQuizzes.every((q) => q.isProctored) ? 'MET' : 'NOT_MET',
        evidence: `${proctoredQuizzes.filter((q) => q.isProctored).length}/${proctoredQuizzes.length} quizzes proctored`,
      },
      {
        key: 'orientation9of9',
        label: 'Orientation 9/9 before Unit 1',
        status: enrolledCount > 0 && orientationCount >= enrolledCount ? 'MET' : 'NOT_MET',
        evidence: `${orientationCount}/${enrolledCount} completed`,
      },
      {
        key: 'programDirectorRn',
        label: 'Program Director is an RN',
        status: hasRnDirector ? 'MET' : 'NOT_MET',
        evidence: hasRnDirector ? 'Verified RN credential' : 'Missing active RN credential',
      },
      {
        key: 'instructorInteraction',
        label: 'Instructor interaction each unit',
        status: hasInstructorInteraction ? 'MET' : 'NOT_MET',
        evidence: hasInstructorInteraction ? 'Instructor feedback recorded' : 'Pending graded interactions',
      },
      {
        key: 'wabonVideosComplete',
        label: 'WABON videos complete',
        status: allVideos.length > 0 && linkedVideos.length === allVideos.length ? 'MET' : 'NOT_MET',
        evidence: `${linkedVideos.length}/${allVideos.length} linked`,
      },
      {
        key: 'allInstructorsApproved',
        label: 'All instructors approved',
        status: validCredentials.length > 0 ? 'MET' : 'NOT_MET',
        evidence: `${validCredentials.length} active credential(s)`,
      },
      {
        key: 'enrollmentAgreementsSigned',
        label: 'Enrollment agreements signed',
        status: enrolledCount > 0 && agreementsSignedCount >= enrolledCount ? 'MET' : 'NOT_MET',
        evidence: `${agreementsSignedCount}/${enrolledCount}`,
      },
    ];

    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      courseId: cohort.courseId,
      courseTitle: cohort.course.title,
      metCount: checklist.filter((c) => c.status === 'MET').length,
      totalChecks: checklist.length,
      checklist,
    };
  }
}
