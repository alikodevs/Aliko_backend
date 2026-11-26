import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { CourseDomain, CourseStatus } from '@prisma/client/academy';

@Injectable()
export class HealthAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  private async assertAdminOrAuditor(
    user: AuthenticatedUser,
    allowAuditor = true,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);
    const allowed = allowAuditor
      ? ['ADMIN', 'COURSE_MANAGER', 'COMMISSION_AUDITOR']
      : ['ADMIN'];
    if (!allowed.includes(profile.role)) {
      throw new ForbiddenException(
        'Insufficient permissions for Health Admin oversight.',
      );
    }
    return profile;
  }

  /**
   * A1: Global Admin Health Dashboard (KPIs, cohort compliance, alerts, payments/agreements, unit pass rates)
   */
  async getAdminDashboard(user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, true);

    const now = new Date();
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [
      healthCourses,
      healthCohorts,
      credentials,
      openRefunds,
      approvals,
      apps,
      videoContents,
      skillVideos,
    ] = await Promise.all([
      this.prisma.course.findMany({
        where: { domain: CourseDomain.HEALTH, status: { not: CourseStatus.ARCHIVED } },
        include: {
          modules: {
            where: { isOrientationModule: false, unitNumber: { gte: 1, lte: 9 } },
            orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
            include: {
              exercises: {
                select: { id: true, type: true, isProctored: true, passingScorePercent: true },
              },
            },
          },
        },
      }),
      this.prisma.cohort.findMany({
        where: { course: { domain: CourseDomain.HEALTH } },
        include: {
          course: { select: { id: true, title: true, version: true, isLocked: true } },
          enrollments: {
            where: { status: 'ACTIVE', cohortRole: 'STUDENT' },
            select: { userId: true },
          },
        },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.instructorCredential.findMany(),
      this.prisma.refundRequest.findMany({ where: { status: 'OPEN' } }),
      this.prisma.regulatoryApproval.findMany({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.studentAdmissionsApplication.findMany({
        select: { cohortId: true, agreementSigned: true, orientationCompleted: true },
      }),
      this.prisma.content.findMany({
        where: {
          type: 'VIDEO',
          lesson: { module: { course: { domain: CourseDomain.HEALTH } } },
        },
        select: { id: true, title: true, url: true },
      }),
      this.prisma.coreSkill.findMany({
        select: { id: true, skillNumber: true, name: true, demoVideoUrl: true },
      }),
    ]);

    const pendingCredentials = credentials.filter((c) => !c.approvedByDirectorAt || !c.dohVerifiedAt);
    const expiringCredentials = credentials.filter(
      (c) => c.rnLicenseExpiration <= in60Days,
    );
    const pendingVideos = videoContents.filter((v) => !v.url || !v.url.trim());
    const missingSkillVideos = skillVideos.filter((s) => !s.demoVideoUrl || !s.demoVideoUrl.trim());

    const cohortCompliance = healthCohorts.map((c) => {
      const enrolled = c.enrollments.length;
      const instructorCount = Math.max(1, c.assignedInstructorIds?.length || 1);
      const durationDays = Math.round(
        (c.endDate.getTime() - c.startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const agreementsSigned = apps.filter(
        (a) => a.cohortId === c.id && a.agreementSigned,
      ).length;
      const within30Cap = enrolled <= instructorCount * 30;
      const within10Ratio = enrolled <= instructorCount * 10;
      const within90Days = c.isHighSchoolTenMonth || durationDays <= 90;

      return {
        cohortId: c.id,
        cohortName: c.name,
        courseTitle: c.course.title,
        courseVersion: c.course.version,
        enrolledCount: enrolled,
        maxTheoryCap: instructorCount * 30,
        within30Cap,
        within10Ratio,
        within90Days,
        agreementsSigned,
        complianceScorePercent: Math.round(
          (([within30Cap, within10Ratio, within90Days].filter(Boolean).length) / 3) * 100,
        ),
      };
    });

    // Pass rate by unit (U1–U9) across active HEALTH courses
    const allQuizIds = healthCourses.flatMap((c) =>
      c.modules.flatMap((m) =>
        m.exercises
          .filter((e) => e.type === 'MULTIPLE_CHOICE' || e.isProctored)
          .map((e) => ({
            exerciseId: e.id,
            unitNumber: m.unitNumber!,
            title: m.title,
            passThreshold: e.passingScorePercent ?? 80,
          })),
      ),
    );
    const quizSubmissions =
      allQuizIds.length > 0
        ? await this.prisma.exerciseSubmission.findMany({
            where: {
              exerciseId: { in: allQuizIds.map((q) => q.exerciseId) },
              status: 'GRADED',
            },
            select: { exerciseId: true, score: true },
          })
        : [];

    const passRateByUnit = Array.from({ length: 9 }, (_, i) => {
      const unitNumber = i + 1;
      const matchingQuizzes = allQuizIds.filter((q) => q.unitNumber === unitNumber);
      const exIds = new Set(matchingQuizzes.map((q) => q.exerciseId));
      const subs = quizSubmissions.filter((s) => exIds.has(s.exerciseId));
      const passed = subs.filter((s) => s.score >= 80).length;
      return {
        unitNumber,
        code: `U${unitNumber}`,
        attempts: subs.length,
        passed,
        passRatePercent: subs.length > 0 ? Math.round((passed / subs.length) * 100) : 0,
      };
    });

    const totalEnrolled = healthCohorts.reduce((s, c) => s + c.enrollments.length, 0);
    const totalAgreementsSigned = apps.filter((a) => a.agreementSigned).length;

    return {
      kpis: {
        activeHealthCourses: healthCourses.length,
        activeHealthCohorts: healthCohorts.length,
        totalEnrolledStudents: totalEnrolled,
        pendingCredentialsCount: pendingCredentials.length,
        openRefundsCount: openRefunds.length,
      },
      cohortCompliance,
      alerts: [
        ...(pendingCredentials.length > 0
          ? [{ type: 'CREDENTIAL_PENDING', count: pendingCredentials.length, message: `${pendingCredentials.length} RN credential(s) pending DOH/Director verification` }]
          : []),
        ...(expiringCredentials.length > 0
          ? [{ type: 'LICENSE_EXPIRING', count: expiringCredentials.length, message: `${expiringCredentials.length} RN license(s) expiring within 60 days or expired` }]
          : []),
        ...(pendingVideos.length > 0 || missingSkillVideos.length > 0
          ? [{ type: 'WABON_VIDEOS_PENDING', count: pendingVideos.length + missingSkillVideos.length, message: `${pendingVideos.length} unit video(s) and ${missingSkillVideos.length} skill video(s) pending` }]
          : []),
        ...(openRefunds.length > 0
          ? [{ type: 'REFUND_OPEN', count: openRefunds.length, message: `${openRefunds.length} open refund request(s)` }]
          : []),
      ],
      enrollmentAndPayments: {
        agreementsSigned: totalAgreementsSigned,
        totalEnrolled,
        openRefundRequests: openRefunds.length,
        trtfReporting: 'Reported quarterly',
      },
      approvalsSummary: approvals,
      passRateByUnit,
    };
  }

  /**
   * A2: Programs & Regulatory Approvals + Program Documents
   */
  async listApprovals(user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, true);
    return this.prisma.regulatoryApproval.findMany({ orderBy: { id: 'asc' } });
  }

  async createApproval(dto: any, user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, false);
    return this.prisma.regulatoryApproval.create({
      data: {
        courseId: dto.courseId ? Number(dto.courseId) : null,
        agency: dto.agency,
        title: dto.title,
        statuteRef: dto.statuteRef || null,
        status: dto.status || 'PLANNED',
        nextStep: dto.nextStep || null,
        submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : null,
        approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : null,
        notes: dto.notes || null,
      },
    });
  }

  async updateApproval(id: number, dto: any, user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, false);
    const existing = await this.prisma.regulatoryApproval.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Regulatory approval record not found');
    return this.prisma.regulatoryApproval.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.nextStep !== undefined ? { nextStep: dto.nextStep } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.submittedAt !== undefined ? { submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : null } : {}),
        ...(dto.approvedAt !== undefined ? { approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : null } : {}),
      },
    });
  }

  async listProgramDocuments(user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, true);
    return this.prisma.programDocument.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createProgramDocument(dto: any, user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, false);
    return this.prisma.programDocument.create({
      data: {
        courseId: dto.courseId ? Number(dto.courseId) : null,
        title: dto.title,
        category: dto.category || 'APPLICATION_PACKAGE',
        fileUrl: dto.fileUrl,
        sharedWithReviewer: dto.sharedWithReviewer !== false,
        uploadedBy: user.firebaseId,
      },
    });
  }

  async deleteProgramDocument(id: number, user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, false);
    return this.prisma.programDocument.delete({ where: { id } });
  }

  /**
   * A3: Data Clean-Up — Archive duplicate/test courses
   */
  async archiveCourses(courseIds: number[], user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, false);
    const res = await this.prisma.course.updateMany({
      where: { id: { in: courseIds } },
      data: { status: CourseStatus.ARCHIVED },
    });
    return { archivedCount: res.count, courseIds };
  }

  /**
   * A6: Content Library — WABON Asset Tracker & Login-Only Enforcement
   */
  async getContentLibrary(user: AuthenticatedUser, courseId?: number) {
    await this.assertAdminOrAuditor(user, true);

    const [contents, skills] = await Promise.all([
      this.prisma.content.findMany({
        where: {
          lesson: {
            module: {
              course: {
                domain: CourseDomain.HEALTH,
                ...(courseId ? { id: courseId } : {}),
              },
            },
          },
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              type: true,
              module: { select: { id: true, unitNumber: true, title: true } },
            },
          },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.coreSkill.findMany({ orderBy: { skillNumber: 'asc' } }),
    ]);

    const videos = contents.filter((c) => c.type === 'VIDEO');
    const loginOnlyFiles = contents.filter((c) => !c.isDownloadable && c.visibility === 'LOGGED_IN_ONLY');
    const skillDemoVideosLinked = skills.filter((s) => Boolean(s.demoVideoUrl && s.demoVideoUrl.trim())).length;

    const assets = [
      ...contents.map((c) => ({
        assetKind: 'LESSON_CONTENT',
        id: c.id,
        title: c.title,
        type: c.type,
        unitNumber: c.lesson.module.unitNumber,
        usedIn: c.lesson.title,
        visibility: c.visibility,
        isDownloadable: c.isDownloadable,
        status: c.url && c.url.trim() ? 'LIVE' : 'PENDING',
        url: c.url,
      })),
      ...skills
        .filter((s) => !s.demoVideoUrl || !s.demoVideoUrl.trim())
        .map((s) => ({
          assetKind: 'SKILL_DEMO',
          id: s.id,
          title: `${s.name} (#${s.skillNumber})`,
          type: 'VIDEO',
          unitNumber: s.taughtInUnit,
          usedIn: `Skill #${s.skillNumber}`,
          visibility: 'LOGGED_IN_ONLY',
          isDownloadable: false,
          status: 'TO_PRODUCE',
          url: null,
        })),
    ];

    return {
      summary: {
        totalAssets: contents.length,
        totalVideos: videos.length,
        linkedVideos: videos.filter((v) => Boolean(v.url && v.url.trim())).length,
        skillDemoVideosLinked,
        totalSkills: skills.length,
        loginOnlyCompliancePercent:
          contents.length > 0 ? Math.round((loginOnlyFiles.length / contents.length) * 100) : 100,
      },
      missingItems: assets.filter((a) => a.status !== 'LIVE'),
      assets,
    };
  }

  /**
   * A8: WABON & Workforce Board Reviewer Access + Audit Logging
   */
  async listReviewers(user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, true);
    return this.prisma.reviewerAccess.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { auditLogs: true } } },
    });
  }

  async inviteReviewer(dto: any, user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, false);
    return this.prisma.reviewerAccess.create({
      data: {
        email: dto.email,
        userId: dto.userId || null,
        agency: dto.agency || 'WABON',
        reviewerTitle: dto.reviewerTitle || 'Nursing education consultant',
        scope: dto.scope || 'Program + all cohorts + course player',
        maskStudentNames: Boolean(dto.maskStudentNames),
        status: 'INVITED',
        expiresAt: new Date(dto.expiresAt),
        invitedBy: user.firebaseId,
      },
    });
  }

  async updateReviewerStatus(id: number, status: string, user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, false);
    return this.prisma.reviewerAccess.update({
      where: { id },
      data: { status },
    });
  }

  async logReviewerAction(reviewerId: number, action: string, resource: string, ipAddress?: string) {
    await this.prisma.reviewerAccess.update({
      where: { id: reviewerId },
      data: { lastActiveAt: new Date(), status: 'ACTIVE' },
    });
    return this.prisma.reviewerAuditLog.create({
      data: { reviewerId, action, resource, ipAddress: ipAddress || null },
    });
  }

  async getReviewerAuditLogs(user: AuthenticatedUser, reviewerId?: number) {
    await this.assertAdminOrAuditor(user, true);
    return this.prisma.reviewerAuditLog.findMany({
      where: reviewerId ? { reviewerId } : undefined,
      include: { reviewer: { select: { email: true, agency: true, reviewerTitle: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /**
   * A9: Workforce Board Refunds & Agreements
   */
  private calculateWorkforceBoardRefund(tuitionPaid: number, progressPercent: number): { amount: number; rule: string } {
    if (progressPercent <= 0) {
      return { amount: tuitionPaid, rule: '100% refund before instruction begins (WAC 490-105)' };
    }
    if (progressPercent <= 10) {
      return { amount: Number((tuitionPaid * 0.9).toFixed(2)), rule: '90% refund (<= 10% program completed)' };
    }
    if (progressPercent <= 25) {
      return { amount: Number((tuitionPaid * 0.75).toFixed(2)), rule: '75% refund (11%-25% program completed)' };
    }
    if (progressPercent <= 50) {
      return { amount: Number((tuitionPaid * 0.5).toFixed(2)), rule: '50% refund (26%-50% program completed)' };
    }
    return { amount: 0, rule: '0% refund (> 50% program completed per signed agreement)' };
  }

  async listRefunds(user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, true);
    return this.prisma.refundRequest.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createRefundRequest(dto: any, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);
    const tuitionPaid = Number(dto.tuitionPaid || 0);
    const progressPercent = Number(dto.progressPercent || 0);
    const calc = this.calculateWorkforceBoardRefund(tuitionPaid, progressPercent);

    return this.prisma.refundRequest.create({
      data: {
        userId: dto.userId || user.firebaseId,
        cohortId: dto.cohortId ? Number(dto.cohortId) : null,
        enrollmentId: dto.enrollmentId ? Number(dto.enrollmentId) : null,
        withdrawalDate: new Date(dto.withdrawalDate || Date.now()),
        progressPercent,
        tuitionPaid,
        calculatedRefundAmount: calc.amount,
        agreementRuleApplied: calc.rule,
        reason: dto.reason || null,
        status: 'OPEN',
      },
    });
  }

  async reviewRefundRequest(id: number, status: string, user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, false);
    const existing = await this.prisma.refundRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Refund request not found');
    return this.prisma.refundRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: user.firebaseId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * A10: Platform Analytics — Hours vs Budget & Time Hotspots (HEALTH programs)
   */
  async getHealthAnalytics(user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, true);

    const [enrollments, modules, progressRows, quizSubs] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { course: { domain: CourseDomain.HEALTH } },
        select: { userId: true, attendanceStatus: true, cohortId: true },
      }),
      this.prisma.module.findMany({
        where: {
          course: { domain: CourseDomain.HEALTH },
          isOrientationModule: false,
          unitNumber: { gte: 1, lte: 9 },
        },
        orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
        include: {
          lessons: { select: { id: true, title: true, estimatedHours: true, hourType: true } },
        },
      }),
      this.prisma.progress.findMany({
        where: {
          course: { domain: CourseDomain.HEALTH },
          activeTimeSeconds: { gt: 0 },
        },
        select: { userId: true, moduleId: true, lessonId: true, activeTimeSeconds: true },
      }),
      this.prisma.exerciseSubmission.findMany({
        where: {
          status: 'GRADED',
          exercise: {
            OR: [{ type: 'MULTIPLE_CHOICE' }, { isProctored: true }],
            module: { course: { domain: CourseDomain.HEALTH } },
          },
        },
        select: { score: true },
      }),
    ]);

    const verifiedWeek1 = enrollments.filter((e) => e.attendanceStatus === 'VERIFIED_PRESENT').length;
    const week1RetentionPercent =
      enrollments.length > 0 ? Math.round((verifiedWeek1 / enrollments.length) * 100) : 0;
    const avgUnitQuizScore =
      quizSubs.length > 0
        ? Math.round(quizSubs.reduce((s, q) => s + q.score, 0) / quizSubs.length)
        : 0;

    // Group lesson time for hotspot detection
    const lessonTimeMap = new Map<number, { totalSec: number; users: Set<string> }>();
    for (const p of progressRows) {
      if (!p.lessonId) continue;
      const entry = lessonTimeMap.get(p.lessonId) || { totalSec: 0, users: new Set() };
      entry.totalSec += p.activeTimeSeconds;
      entry.users.add(p.userId);
      lessonTimeMap.set(p.lessonId, entry);
    }

    const hoursVsBudget = modules.map((mod) => {
      const budgetMinutes = Math.round((mod.targetTheoryHours || 0) * 60);
      const modRows = progressRows.filter((p) => p.moduleId === mod.id);
      const users = new Set(modRows.map((r) => r.userId));
      const totalMinutes = modRows.reduce((s, r) => s + r.activeTimeSeconds, 0) / 60;
      const avgActualMinutes = users.size > 0 ? Math.round(totalMinutes / users.size) : 0;
      return {
        moduleId: mod.id,
        unitNumber: mod.unitNumber,
        title: mod.title,
        budgetMinutes,
        avgActualMinutes,
      };
    });

    const timeHotspots = modules
      .flatMap((mod) =>
        mod.lessons.map((l) => {
          const stats = lessonTimeMap.get(l.id);
          const avgMinutes =
            stats && stats.users.size > 0
              ? Math.round(stats.totalSec / 60 / stats.users.size)
              : 0;
          const budgetMinutes = Math.round((l.estimatedHours || 0) * 60);
          return {
            unitNumber: mod.unitNumber,
            lessonId: l.id,
            item: l.title,
            avgMinutes,
            budgetMinutes,
            deltaMinutes: avgMinutes - budgetMinutes,
          };
        }),
      )
      .filter((h) => h.avgMinutes > 0 && h.budgetMinutes > 0)
      .sort((a, b) => Math.abs(b.deltaMinutes) - Math.abs(a.deltaMinutes))
      .slice(0, 10);

    return {
      totalEnrollments: enrollments.length,
      week1RetentionPercent,
      avgUnitQuizScore,
      hoursVsBudget,
      timeHotspots,
    };
  }

  async listFacilities(user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, true);
    return this.prisma.clinicalFacility.findMany({ orderBy: { name: 'asc' } });
  }

  async createFacility(dto: any, user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, false);
    return this.prisma.clinicalFacility.create({
      data: {
        name: dto.name,
        unitType: dto.unitType || 'Subacute Unit',
        address: dto.address || null,
        agreementSigned: Boolean(dto.agreementSigned),
        agreementUrl: dto.agreementUrl || null,
        agreementExpiresAt: dto.agreementExpiresAt ? new Date(dto.agreementExpiresAt) : null,
        maxRatio: dto.maxRatio ? Math.min(10, Number(dto.maxRatio)) : 10,
      },
    });
  }

  async updateFacility(id: number, dto: any, user: AuthenticatedUser) {
    await this.assertAdminOrAuditor(user, false);
    return this.prisma.clinicalFacility.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.unitType !== undefined ? { unitType: dto.unitType } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.agreementSigned !== undefined ? { agreementSigned: Boolean(dto.agreementSigned) } : {}),
        ...(dto.agreementUrl !== undefined ? { agreementUrl: dto.agreementUrl } : {}),
        ...(dto.agreementExpiresAt !== undefined ? { agreementExpiresAt: dto.agreementExpiresAt ? new Date(dto.agreementExpiresAt) : null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }
}
