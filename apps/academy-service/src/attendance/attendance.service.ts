import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import {
  AttendanceReportQueryDto,
  AttendanceOverrideDto,
} from './dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * WAC 246-841A-440 (Req 12) First-Week Attendance Census Report
   * Generates a comprehensive census report for a Cohort or Course,
   * showing all students, their Week-1 attendance verification status,
   * qualifying academic gate assignment, course outcome, and census compliance.
   */
  async getWeekOneAttendanceReport(
    query: AttendanceReportQueryDto,
    user: AuthenticatedUser,
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const isAdmin = academyProfile.role === 'ADMIN';
    const isAuditor = academyProfile.role === 'COMMISSION_AUDITOR';

    let courseId = query.courseId;
    let cohort: any = null;

    if (query.cohortId) {
      cohort = await this.prisma.cohort.findUnique({
        where: { id: query.cohortId },
        include: { course: true },
      });
      if (!cohort) {
        throw new NotFoundException(`Cohort ${query.cohortId} not found`);
      }
      courseId = cohort.courseId;
    }

    if (!courseId) {
      throw new BadRequestException('Either cohortId or courseId must be provided');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { id: 'asc' },
          include: {
            exercises: {
              where: { isWeekOneAttendanceGate: true },
            },
            discussionTopics: {
              where: { isWeekOneAttendanceGate: true },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    const isInstructor =
      course.instructorId === user.firebaseId ||
      (cohort && cohort.assignedInstructorIds?.includes(user.firebaseId));

    if (!isAdmin && !isAuditor && !isInstructor) {
      throw new ForbiddenException(
        'You do not have permission to view attendance reports for this course.',
      );
    }

    // Identify designated Week-1 Attendance Gate Assignment(s)
    const gateExercises: any[] = [];
    const gateDiscussions: any[] = [];
    for (const mod of course.modules) {
      for (const ex of mod.exercises) {
        gateExercises.push({
          ...ex,
          moduleTitle: mod.title,
        });
      }
      for (const dt of mod.discussionTopics) {
        gateDiscussions.push({
          ...dt,
          moduleTitle: mod.title,
        });
      }
    }

    // Fetch Enrollments for Course/Cohort
    const enrollmentWhere: any = { courseId };
    if (query.cohortId) {
      enrollmentWhere.cohortId = query.cohortId;
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: enrollmentWhere,
      include: {
        cohort: true,
        profile: true,
      },
      orderBy: { enrolledAt: 'asc' },
    });

    // Fetch User metadata (names, emails) via User Service
    const studentUserIds = enrollments.map((e) => e.userId);
    let authUsers: AuthenticatedUser[] = [];
    try {
      if (studentUserIds.length > 0) {
        authUsers = await this.userService.getUsersByIds(studentUserIds);
      }
    } catch (err) {
      this.logger.warn(`Could not fetch user details from auth service: ${err.message}`);
    }
    const userMap = new Map(authUsers.map((u) => [u.firebaseId, u]));

    // Fetch submissions for all gate exercises
    const gateExerciseIds = gateExercises.map((g) => g.id);
    const exerciseSubmissions =
      gateExerciseIds.length > 0 && studentUserIds.length > 0
        ? await this.prisma.exerciseSubmission.findMany({
            where: {
              exerciseId: { in: gateExerciseIds },
              userId: { in: studentUserIds },
            },
            include: { exercise: true },
            orderBy: { id: 'desc' },
          })
        : [];

    const submissionMap = new Map<string, any>();
    for (const sub of exerciseSubmissions) {
      const key = `${sub.userId}_${sub.exerciseId}`;
      if (!submissionMap.has(key)) {
        submissionMap.set(key, sub);
      }
    }

    // Fetch discussion posts for gate discussion topics
    const gateTopicIds = gateDiscussions.map((g) => g.id);
    const discussionPosts =
      gateTopicIds.length > 0 && studentUserIds.length > 0
        ? await this.prisma.discussionPost.findMany({
            where: {
              topicId: { in: gateTopicIds },
              userId: { in: studentUserIds },
            },
            include: { grade: true, topic: true },
            orderBy: { createdAt: 'desc' },
          })
        : [];

    const discussionMap = new Map<string, any>();
    for (const post of discussionPosts) {
      const key = `${post.userId}_${post.topicId}`;
      if (!discussionMap.has(key)) {
        discussionMap.set(key, post);
      }
    }

    // Reference dates for census
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const startDate = cohort ? new Date(cohort.startDate) : null;
    const censusDeadline = startDate
      ? new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;

    // Fetch verified theory seat-time (Progress.activeTimeSeconds) for enrolled students
    const enrolledUserIds = enrollments.map((e) => e.userId);
    const progressRows =
      enrolledUserIds.length > 0
        ? await this.prisma.progress.findMany({
            where: {
              courseId,
              userId: { in: enrolledUserIds },
              activeTimeSeconds: { gt: 0 },
            },
            select: { userId: true, activeTimeSeconds: true, updatedAt: true },
          })
        : [];

    const seatTimeByUser = new Map<string, { totalSeconds: number; lastActiveAt: Date | null }>();
    for (const row of progressRows) {
      const prev = seatTimeByUser.get(row.userId) || { totalSeconds: 0, lastActiveAt: null };
      prev.totalSeconds += row.activeTimeSeconds || 0;
      if (!prev.lastActiveAt || row.updatedAt > prev.lastActiveAt) {
        prev.lastActiveAt = row.updatedAt;
      }
      seatTimeByUser.set(row.userId, prev);
    }

    let verifiedCount = 0;
    let pendingCount = 0;
    let noShowCount = 0;
    let droppedCount = 0;
    let atRisk5DayCount = 0;

    const studentRoster = enrollments.map((enr) => {
      const u = userMap.get(enr.userId);
      const studentStartDate = startDate || new Date(enr.enrolledAt);
      const studentDeadline = censusDeadline || new Date(studentStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const daysElapsed = Math.max(
        0,
        Math.floor((now.getTime() - studentStartDate.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const isPastDeadline = now > studentDeadline;
      const isOverdue =
        isPastDeadline &&
        enr.attendanceStatus !== 'VERIFIED_PRESENT' &&
        enr.attendanceStatus !== 'ADMINISTRATIVE_DROP';

      if (enr.attendanceStatus === 'VERIFIED_PRESENT') verifiedCount++;
      else if (enr.attendanceStatus === 'NO_SHOW_AT_RISK') noShowCount++;
      else if (enr.attendanceStatus === 'ADMINISTRATIVE_DROP') droppedCount++;
      else pendingCount++;

      // Find qualification evidence
      let qualifyingEvidence: any = null;
      for (const ge of gateExercises) {
        const sub = submissionMap.get(`${enr.userId}_${ge.id}`);
        if (sub) {
          qualifyingEvidence = {
            type: 'EXERCISE_ASSIGNMENT',
            id: ge.id,
            title: ge.title,
            courseOutcome: ge.courseOutcome,
            submittedAt: sub.id, // submission ID or timestamp
            isCorrect: sub.isCorrect,
            score: sub.score,
            status: sub.status,
          };
          break;
        }
      }

      if (!qualifyingEvidence) {
        for (const gd of gateDiscussions) {
          const post = discussionMap.get(`${enr.userId}_${gd.id}`);
          if (post) {
            qualifyingEvidence = {
              type: 'DISCUSSION_POST',
              id: gd.id,
              title: gd.title,
              courseOutcome: gd.courseOutcome,
              postedAt: post.createdAt,
              grade: post.grade ? post.grade.score : null,
            };
            break;
          }
        }
      }

      const seatInfo = seatTimeByUser.get(enr.userId);
      const verifiedTheoryHours = Number(((seatInfo?.totalSeconds || 0) / 3600).toFixed(2));
      const lastSeatTimeAt = seatInfo?.lastActiveAt || null;
      const atRisk5Day = !lastSeatTimeAt || lastSeatTimeAt < fiveDaysAgo;
      if (atRisk5Day) atRisk5DayCount++;

      return {
        enrollmentId: enr.id,
        userId: enr.userId,
        studentName: u ? `${u.firstname || ''} ${u.lastname || ''}`.trim() : 'N/A',
        studentEmail: u?.email || 'N/A',
        attendanceStatus: enr.attendanceStatus,
        attendanceVerifiedAt: enr.attendanceVerifiedAt,
        attendanceVerifiedBy: enr.attendanceVerifiedBy,
        attendanceNotes: enr.attendanceNotes,
        enrolledAt: enr.enrolledAt,
        daysElapsedSinceStart: daysElapsed,
        isOverdueCensus: isOverdue,
        verifiedTheoryHours,
        lastSeatTimeAt,
        atRisk5Day,
        censusRowStatus: atRisk5Day ? 'AT_RISK' : enr.attendanceStatus === 'VERIFIED_PRESENT' ? 'VERIFIED' : enr.attendanceStatus,
        qualifyingEvidence,
      };
    });

    const totalStudents = enrollments.length;
    const complianceRate =
      totalStudents > 0
        ? Math.round((verifiedCount / totalStudents) * 100 * 10) / 10
        : 100;

    return {
      reportType: 'WAC_246_841A_440_WEEK_ONE_ATTENDANCE_CENSUS',
      statutoryCitation: 'WAC 246-841A-440 Requirement 12',
      statutoryTitle:
        'An academic-based assignment related to the course outcome in the first week of class for the purpose of reporting attendance.',
      generatedAt: now.toISOString(),
      course: {
        id: course.id,
        title: course.title,
        instructorId: course.instructorId,
        outcomes: course.outcomes,
      },
      cohort: cohort
        ? {
            id: cohort.id,
            name: cohort.name,
            startDate: cohort.startDate,
            censusDeadlineDays: 7,
            censusDeadlineDate: censusDeadline?.toISOString(),
            isPastCensusDeadline: censusDeadline ? now > censusDeadline : false,
          }
        : null,
      gateAssignmentsConfigured: {
        totalGateExercises: gateExercises.length,
        totalGateDiscussions: gateDiscussions.length,
        hasConfiguredGate: gateExercises.length > 0 || gateDiscussions.length > 0,
        exercises: gateExercises.map((e) => ({
          id: e.id,
          moduleId: e.moduleId,
          moduleTitle: e.moduleTitle,
          title: e.title,
          type: e.type,
          points: e.points,
          courseOutcome: e.courseOutcome,
          description: e.description,
        })),
        discussions: gateDiscussions.map((d) => ({
          id: d.id,
          moduleId: d.moduleId,
          moduleTitle: d.moduleTitle,
          title: d.title,
          maxPoints: d.maxPoints,
          courseOutcome: d.courseOutcome,
          prompt: d.prompt,
        })),
      },
      summaryMetrics: {
        totalEnrolled: totalStudents,
        verifiedPresent: verifiedCount,
        pendingVerification: pendingCount,
        noShowAtRisk: noShowCount,
        administrativeDrop: droppedCount,
        complianceRatePercent: complianceRate,
      },
      roster: studentRoster,
    };
  }

  /**
   * Get designated attendance gate assignment(s) and their linked course outcomes
   */
  async getGateAssignment(courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { id: 'asc' },
          include: {
            exercises: {
              where: { isWeekOneAttendanceGate: true },
            },
            discussionTopics: {
              where: { isWeekOneAttendanceGate: true },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    const gateExercises = course.modules.flatMap((m) =>
      m.exercises.map((e) => ({ ...e, moduleTitle: m.title })),
    );
    const gateDiscussions = course.modules.flatMap((m) =>
      m.discussionTopics.map((d) => ({ ...d, moduleTitle: m.title })),
    );

    return {
      courseId: course.id,
      courseTitle: course.title,
      courseOutcomes: course.outcomes,
      hasGateAssignment: gateExercises.length > 0 || gateDiscussions.length > 0,
      gateExercises,
      gateDiscussions,
    };
  }

  /**
   * Run automated Day 7 Census Sweep for a Cohort
   * Flags students who have not completed the Week 1 Academic Gate assignment
   * past the Day 7 deadline as NO_SHOW_AT_RISK.
   */
  async runCohortCensus(
    cohortId: number,
    user: AuthenticatedUser,
    reason?: string,
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const isAdmin = academyProfile.role === 'ADMIN';

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: { course: true },
    });

    if (!cohort) {
      throw new NotFoundException(`Cohort ${cohortId} not found`);
    }

    const isInstructor =
      cohort.course.instructorId === user.firebaseId ||
      cohort.assignedInstructorIds?.includes(user.firebaseId);

    if (!isAdmin && !isInstructor) {
      throw new ForbiddenException(
        'Only instructors or administrators can execute the cohort census sweep.',
      );
    }

    const now = new Date();
    const startDate = new Date(cohort.startDate);
    const censusDeadline = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const pendingEnrollments = await this.prisma.enrollment.findMany({
      where: {
        cohortId,
        attendanceStatus: 'PENDING_VERIFICATION',
      },
    });

    let flaggedCount = 0;
    const flaggedStudentIds: string[] = [];

    for (const enr of pendingEnrollments) {
      if (now > censusDeadline) {
        await this.prisma.enrollment.update({
          where: { id: enr.id },
          data: {
            attendanceStatus: 'NO_SHOW_AT_RISK',
            attendanceNotes: `Flagged via Day 7 Census Sweep: No academic gate assignment completed by Day 7 deadline (${censusDeadline.toLocaleDateString()}). ${reason || ''}`.trim(),
          },
        });
        flaggedCount++;
        flaggedStudentIds.push(enr.userId);
      }
    }

    this.logger.log(
      `Cohort ${cohortId} census sweep complete: ${flaggedCount} students flagged as NO_SHOW_AT_RISK by ${user.firebaseId}`,
    );

    return {
      message: 'Census sweep executed successfully',
      cohortId,
      cohortName: cohort.name,
      censusDeadline: censusDeadline.toISOString(),
      isPastDeadline: now > censusDeadline,
      totalPendingEvaluated: pendingEnrollments.length,
      flaggedAsNoShowAtRisk: flaggedCount,
      flaggedStudentIds,
    };
  }

  /**
   * Instructor or Admin Manual Attendance Status Override / Verification
   */
  async overrideAttendance(
    enrollmentId: number,
    dto: AttendanceOverrideDto,
    user: AuthenticatedUser,
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const isAdmin = academyProfile.role === 'ADMIN';

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: true,
        cohort: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }

    const isInstructor =
      enrollment.course.instructorId === user.firebaseId ||
      (enrollment.cohort &&
        enrollment.cohort.assignedInstructorIds?.includes(user.firebaseId));

    if (!isAdmin && !isInstructor) {
      throw new ForbiddenException(
        'You do not have permission to modify attendance for this enrollment.',
      );
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        attendanceStatus: dto.status,
        attendanceVerifiedAt:
          dto.status === 'VERIFIED_PRESENT' ? new Date() : enrollment.attendanceVerifiedAt,
        attendanceVerifiedBy: `MANUAL_OVERRIDE_${user.firebaseId}`,
        attendanceNotes: dto.notes || enrollment.attendanceNotes,
      },
    });

    this.logger.log(
      `Enrollment ${enrollmentId} attendance updated to ${dto.status} by ${user.firebaseId}`,
    );

    return updated;
  }
}

