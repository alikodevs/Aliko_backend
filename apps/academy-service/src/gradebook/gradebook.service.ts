import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetStudentGradeReportDto, GetCohortGradebookDto } from './dto';
import { AcademyRole } from '@prisma/client/academy';

@Injectable()
export class GradebookService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateLetterGrade(scorePercent: number): string {
    if (scorePercent >= 93) return 'A';
    if (scorePercent >= 90) return 'A-';
    if (scorePercent >= 87) return 'B+';
    if (scorePercent >= 83) return 'B';
    if (scorePercent >= 80) return 'B-';
    return 'F'; // Below 80% is failing in WABON accredited NA programs
  }

  async getStudentGradeReport(
    targetUserId: string,
    cohortId: number,
    requestingUserId: string,
    requestingRole?: AcademyRole | string,
  ) {
    const isStaffOrAuditor =
      requestingRole === AcademyRole.ADMIN ||
      requestingRole === AcademyRole.COURSE_MANAGER ||
      requestingRole === AcademyRole.COMMISSION_AUDITOR ||
      requestingRole === AcademyRole.INSTRUCTOR ||
      requestingRole === 'ADMIN' ||
      requestingRole === 'COURSE_MANAGER' ||
      requestingRole === 'COMMISSION_AUDITOR' ||
      requestingRole === 'INSTRUCTOR';

    if (targetUserId !== requestingUserId && !isStaffOrAuditor) {
      throw new ForbiddenException('You do not have permission to view this grade report');
    }

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  include: {
                    exercises: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cohort) {
      throw new NotFoundException(`Cohort with ID ${cohortId} not found`);
    }

    // 1. Gather all course exercises
    const allCourseExercises = cohort.course.modules.flatMap((m) =>
      m.lessons.flatMap((l) => l.exercises),
    );
    const exerciseIds = allCourseExercises.map((e) => e.id);

    // 2. Fetch student submissions for these exercises
    const submissions = await this.prisma.exerciseSubmission.findMany({
      where: {
        userId: targetUserId,
        exerciseId: { in: exerciseIds },
      },
      include: {
        exercise: true,
      },
    });

    // Check exam proctor sessions
    const examSessions = await this.prisma.examSession.findMany({
      where: {
        userId: targetUserId,
        exerciseId: { in: exerciseIds },
      },
    });

    const examExerciseIds = new Set(examSessions.map((s) => s.exerciseId));

    // Separate quizzes from exams
    const quizSubmissions = submissions.filter((s) => !examExerciseIds.has(s.exerciseId));
    const examSubmissions = submissions.filter((s) => examExerciseIds.has(s.exerciseId));

    // Calculate Quiz Score %
    let quizAvg = 0;
    if (quizSubmissions.length > 0) {
      const totalScore = quizSubmissions.reduce((acc, s) => acc + s.score, 0);
      quizAvg = totalScore / quizSubmissions.length;
    }

    // Calculate Exam Score %
    let examAvg = 0;
    if (examSessions.length > 0) {
      const scores = examSessions.filter((s) => s.score !== null).map((s) => s.score as number);
      if (scores.length > 0) {
        examAvg = scores.reduce((acc, score) => acc + score, 0) / scores.length;
      }
    } else if (examSubmissions.length > 0) {
      examAvg = examSubmissions.reduce((acc, s) => acc + s.score, 0) / examSubmissions.length;
    }

    // 3. Discussion Posts & Grades
    const discussionPosts = await this.prisma.discussionPost.findMany({
      where: { userId: targetUserId },
      include: {
        grade: true,
        topic: true,
      },
    });

    let discussionAvg = 0;
    const gradedDiscussions = discussionPosts.filter((p) => p.grade !== null);
    if (gradedDiscussions.length > 0) {
      const discPercents = gradedDiscussions.map((p) => {
        const maxPts = p.topic.maxPoints || 10;
        return (p.grade!.score / maxPts) * 100;
      });
      discussionAvg = discPercents.reduce((acc, p) => acc + p, 0) / discPercents.length;
    }

    // Weighted Theory Calculation:
    // If exams exist: 40% exams, 40% quizzes, 20% discussions
    // If no exams yet: 70% quizzes, 30% discussions
    let overallTheoryPercent = 0;
    if (examAvg > 0) {
      overallTheoryPercent = quizAvg * 0.4 + examAvg * 0.4 + (discussionAvg > 0 ? discussionAvg * 0.2 : quizAvg * 0.2);
    } else if (quizAvg > 0 || discussionAvg > 0) {
      overallTheoryPercent = quizAvg * 0.7 + discussionAvg * 0.3;
    }

    overallTheoryPercent = parseFloat(overallTheoryPercent.toFixed(2));
    const letterGrade = this.calculateLetterGrade(overallTheoryPercent);
    const isTheoryPassed = overallTheoryPercent >= 80.0;

    // 4. Skills Lab Checkoffs
    const totalSkillsCount = await this.prisma.coreSkill.count();
    const studentCheckoffs = await this.prisma.skillCheckoff.findMany({
      where: {
        userId: targetUserId,
        cohortId,
        passed: true,
      },
    });
    const passedSkillsCount = studentCheckoffs.length;
    const isSkillsLabComplete = totalSkillsCount > 0 && passedSkillsCount >= totalSkillsCount;

    // 5. Clinical Shift Hours
    const clinicalAttendances = await this.prisma.clinicalShiftAttendance.findMany({
      where: {
        userId: targetUserId,
        shift: { cohortId },
      },
    });

    const totalClinicalHours = clinicalAttendances.reduce((acc, a) => acc + a.hoursCompleted, 0);
    const minClinicalHoursRequired = 40.0;
    const isClinicalHoursMet = totalClinicalHours >= minClinicalHoursRequired;

    // Determine Overall WABON Certification Readiness Status
    let complianceStatus = 'FULLY_COMPLIANT_READY_FOR_CERTIFICATION';
    if (!isTheoryPassed) {
      complianceStatus = 'FAILING_THEORY_BELOW_80';
    } else if (!isSkillsLabComplete) {
      complianceStatus = 'PENDING_SKILLS_LAB_CHECKOFFS';
    } else if (!isClinicalHoursMet) {
      complianceStatus = 'PENDING_CLINICAL_HOURS';
    }

    // 6. Student Pacing Engine (WAC Req 16)
    const now = new Date();
    const cohortDurationMs = cohort.endDate.getTime() - cohort.startDate.getTime();
    const elapsedMs = Math.max(0, now.getTime() - cohort.startDate.getTime());
    const daysRemaining = Math.max(
      0,
      Math.ceil((cohort.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const expectedProgressPercent =
      cohortDurationMs > 0
        ? Math.min(100, parseFloat(((elapsedMs / cohortDurationMs) * 100).toFixed(1)))
        : 0;

    const totalExercises = exerciseIds.length;
    const completedExercises = submissions.length;
    const actualProgressPercent =
      totalExercises > 0
        ? Math.min(100, parseFloat(((completedExercises / totalExercises) * 100).toFixed(1)))
        : 0;

    let pacingStatus: 'ON_TRACK' | 'AT_RISK' | 'BEHIND_SCHEDULE' = 'ON_TRACK';
    if (actualProgressPercent < expectedProgressPercent - 25 || overallTheoryPercent < 80) {
      pacingStatus = 'BEHIND_SCHEDULE';
    } else if (actualProgressPercent < expectedProgressPercent - 10) {
      pacingStatus = 'AT_RISK';
    }

    return {
      userId: targetUserId,
      cohortId,
      courseTitle: cohort.course.title,
      summary: {
        overallTheoryPercent,
        letterGrade,
        isTheoryPassed,
        quizAveragePercent: parseFloat(quizAvg.toFixed(2)),
        examAveragePercent: parseFloat(examAvg.toFixed(2)),
        discussionAveragePercent: parseFloat(discussionAvg.toFixed(2)),
        skillsLab: {
          totalRequired: totalSkillsCount,
          passedCount: passedSkillsCount,
          isSkillsLabComplete,
        },
        clinicalHours: {
          totalCompleted: totalClinicalHours,
          minimumRequired: minClinicalHoursRequired,
          isClinicalHoursMet,
        },
        pacing: {
          status: pacingStatus,
          expectedProgressPercent,
          actualProgressPercent,
          daysRemainingInCohort: daysRemaining,
        },
        complianceStatus,
      },
      details: {
        quizzesCompleted: quizSubmissions.length,
        examsCompleted: examSessions.length || examSubmissions.length,
        discussionsGraded: gradedDiscussions.length,
      },
    };
  }

  async getCohortGradebook(cohortId: number) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { cohortId },
      include: {
        profile: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    const studentReports = await Promise.all(
      enrollments.map(async (e) => {
        try {
          return await this.getStudentGradeReport(
            e.userId,
            cohortId,
            e.userId,
            AcademyRole.INSTRUCTOR,
          );
        } catch {
          return {
            userId: e.userId,
            cohortId,
            summary: {
              overallTheoryPercent: 0,
              letterGrade: 'F',
              isTheoryPassed: false,
              complianceStatus: 'PENDING_DATA',
            },
          };
        }
      }),
    );

    const totalStudents = studentReports.length;
    const passingCount = studentReports.filter(
      (r: any) => r.summary?.complianceStatus === 'FULLY_COMPLIANT_READY_FOR_CERTIFICATION',
    ).length;

    return {
      cohortId,
      totalStudents,
      graduatingCount: passingCount,
      passRatePercent: totalStudents > 0 ? parseFloat(((passingCount / totalStudents) * 100).toFixed(1)) : 0,
      students: studentReports,
    };
  }

  async exportCohortGradebookCsv(cohortId: number): Promise<string> {
    const gradebook = await this.getCohortGradebook(cohortId);

    const headers = [
      'Student ID',
      'Overall Theory %',
      'Letter Grade',
      'Theory Passed',
      'Skills Passed',
      'Skills Total',
      'Clinical Hours',
      'Clinical Met',
      'WABON Compliance Status',
    ];

    const rows = gradebook.students.map((s: any) => {
      const summary = s.summary || {};
      return [
        s.userId,
        summary.overallTheoryPercent ?? 0,
        summary.letterGrade ?? 'N/A',
        summary.isTheoryPassed ? 'YES' : 'NO',
        summary.skillsLab?.passedCount ?? 0,
        summary.skillsLab?.totalRequired ?? 0,
        summary.clinicalHours?.totalCompleted ?? 0,
        summary.clinicalHours?.isClinicalHoursMet ? 'YES' : 'NO',
        summary.complianceStatus ?? 'UNKNOWN',
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * I7: Master Gradebook — one column per WABON unit (U1–U9), 80% pass/remediation, skills & clinical
   */
  async getHealthCohortUnitGradebook(cohortId: number) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        course: {
          include: {
            modules: {
              where: { isOrientationModule: false, unitNumber: { gte: 1, lte: 9 } },
              orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
              include: {
                exercises: {
                  select: { id: true, type: true, points: true, isProctored: true, passingScorePercent: true },
                },
                discussionTopics: { select: { id: true, maxPoints: true } },
              },
            },
          },
        },
        enrollments: {
          where: { status: 'ACTIVE', cohortRole: 'STUDENT' },
          select: { userId: true },
        },
      },
    });
    if (!cohort) throw new NotFoundException(`Cohort ${cohortId} not found`);

    const studentIds = cohort.enrollments.map((e) => e.userId);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const [submissions, checkoffs, clinicalAttendances, progressRows, remediations] =
      await Promise.all([
        this.prisma.exerciseSubmission.findMany({
          where: {
            userId: { in: studentIds },
            exercise: { module: { courseId: cohort.courseId } },
          },
          select: { userId: true, exerciseId: true, score: true, status: true },
        }),
        this.prisma.skillCheckoff.findMany({
          where: { userId: { in: studentIds }, passed: true },
          select: { userId: true, skillId: true },
        }),
        this.prisma.clinicalShiftAttendance.findMany({
          where: { userId: { in: studentIds }, passed: true },
          select: { userId: true, hoursCompleted: true },
        }),
        this.prisma.progress.findMany({
          where: { userId: { in: studentIds }, courseId: cohort.courseId, activeTimeSeconds: { gt: 0 } },
          select: { userId: true, updatedAt: true },
        }),
        this.prisma.studentRemediation.findMany({
          where: { userId: { in: studentIds }, status: { not: 'RESOLVED' } },
          select: { userId: true, id: true },
        }),
      ]);

    const subMap = new Map<string, { score: number; status: string }>();
    for (const s of submissions) {
      subMap.set(`${s.userId}_${s.exerciseId}`, { score: s.score, status: s.status });
    }

    const skillsByStudent = new Map<string, Set<number>>();
    for (const c of checkoffs) {
      if (!skillsByStudent.has(c.userId)) skillsByStudent.set(c.userId, new Set());
      skillsByStudent.get(c.userId)!.add(c.skillId);
    }

    const clinicalByStudent = new Map<string, number>();
    for (const ca of clinicalAttendances) {
      clinicalByStudent.set(ca.userId, (clinicalByStudent.get(ca.userId) || 0) + (ca.hoursCompleted || 0));
    }

    const lastActiveByStudent = new Map<string, Date>();
    for (const p of progressRows) {
      const prev = lastActiveByStudent.get(p.userId);
      if (!prev || p.updatedAt > prev) lastActiveByStudent.set(p.userId, p.updatedAt);
    }

    const remediationByStudent = new Map<string, number>();
    for (const r of remediations) {
      remediationByStudent.set(r.userId, (remediationByStudent.get(r.userId) || 0) + 1);
    }

    let quizScoreSum = 0;
    let quizScoreCount = 0;

    const students = studentIds.map((uid) => {
      const unitScores = cohort.course.modules.map((mod) => {
        const quizEx = mod.exercises.find((e) => e.type === 'MULTIPLE_CHOICE' || e.isProctored);
        const sub = quizEx ? subMap.get(`${uid}_${quizEx.id}`) : undefined;
        const passThreshold = quizEx?.passingScorePercent ?? 80;
        const scorePercent =
          sub && quizEx && quizEx.points > 0
            ? Math.round((sub.score / quizEx.points) * 100)
            : sub?.score ?? null;

        if (scorePercent !== null) {
          quizScoreSum += scorePercent;
          quizScoreCount++;
        }

        return {
          moduleId: mod.id,
          unitNumber: mod.unitNumber,
          code: `U${mod.unitNumber}`,
          title: mod.title,
          score: scorePercent,
          status: sub?.status || 'IN_PROGRESS',
          passed: scorePercent !== null ? scorePercent >= passThreshold : null,
          needsRemediation: scorePercent !== null && scorePercent < passThreshold,
        };
      });

      const lastActive = lastActiveByStudent.get(uid);
      const isPacingAlert = !lastActive || lastActive < fiveDaysAgo;
      const openRemediationCount = remediationByStudent.get(uid) || 0;
      const hasFailingUnit = unitScores.some((u) => u.needsRemediation);

      return {
        userId: uid,
        units: unitScores,
        skillsPassed: skillsByStudent.get(uid)?.size || 0,
        skillsTotal: 22,
        clinicalHours: Number((clinicalByStudent.get(uid) || 0).toFixed(1)),
        clinicalTargetHours: 40,
        openRemediationCount,
        needsRemediation: hasFailingUnit || openRemediationCount > 0,
        paceStatus: isPacingAlert ? 'PACING_ALERT' : 'ON_PACE',
      };
    });

    return {
      cohortId,
      cohortName: cohort.name,
      courseTitle: cohort.course.title,
      passingThresholdPercent: 80,
      totalEnrolled: studentIds.length,
      averageQuizScore: quizScoreCount > 0 ? Math.round(quizScoreSum / quizScoreCount) : 0,
      remediationCount: students.filter((s) => s.needsRemediation).length,
      pacingAlertCount: students.filter((s) => s.paceStatus === 'PACING_ALERT').length,
      unitColumns: cohort.course.modules.map((m) => ({
        moduleId: m.id,
        unitNumber: m.unitNumber,
        code: `U${m.unitNumber}`,
        title: m.title,
      })),
      students,
    };
  }
}
