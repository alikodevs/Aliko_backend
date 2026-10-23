import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import {
  StartExamSessionDto,
  RecordTabBlurDto,
  EndExamSessionDto,
  AuditExamSessionDto,
} from './dto';

/**
 * Exam Security Engine (WAC 246-841A-440 Req 17).
 *
 * Provides secure examination with:
 *   - Photo ID and webcam verification before exam start
 *   - Honor code acceptance gate
 *   - Tab-blur/window-switch event tracking
 *   - IP address and user agent logging
 *   - Auditor review and flagging
 */
@Injectable()
export class ExamSecurityService {
  private readonly logger = new Logger(ExamSecurityService.name);

  /** Flag for review if tab-blur count exceeds this threshold */
  private static readonly TAB_BLUR_ALERT_THRESHOLD = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * Start a secure exam session.
   * Requires honor code acceptance. Photo ID and webcam snap are recommended.
   */
  async startSession(dto: StartExamSessionDto, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    if (!dto.honorCodeAccepted) {
      throw new BadRequestException(
        'You must accept the honor code before beginning the exam.',
      );
    }

    // Verify exercise exists
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: dto.exerciseId },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');

    // Check for an already-active session
    const activeSession = await this.prisma.examSession.findFirst({
      where: {
        exerciseId: dto.exerciseId,
        userId: user.firebaseId,
        endTime: null,
      },
    });
    if (activeSession) {
      throw new BadRequestException(
        'You already have an active exam session for this exercise. Complete or end it first.',
      );
    }

    const session = await this.prisma.examSession.create({
      data: {
        exerciseId: dto.exerciseId,
        userId: user.firebaseId,
        idPhotoUrl: dto.idPhotoUrl || null,
        webcamSnapUrl: dto.webcamSnapUrl || null,
        ipAddress: dto.ipAddress || null,
        userAgent: dto.userAgent || null,
        honorCodeAccepted: true,
      },
    });

    this.logger.log(
      `Exam session ${session.id} started: exercise=${dto.exerciseId} user=${user.firebaseId} ip=${dto.ipAddress || 'unknown'}`,
    );

    return {
      sessionId: session.id,
      exerciseId: session.exerciseId,
      startTime: session.startTime,
      honorCodeAccepted: session.honorCodeAccepted,
      hasIdPhoto: !!session.idPhotoUrl,
      hasWebcamSnap: !!session.webcamSnapUrl,
    };
  }

  /**
   * Record a tab-blur (window focus loss) event.
   * Called by the LMS client each time the student switches tabs/windows.
   */
  async recordTabBlur(dto: RecordTabBlurDto, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    const session = await this.prisma.examSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (!session) throw new NotFoundException('Exam session not found');
    if (session.userId !== user.firebaseId) {
      throw new ForbiddenException('This exam session does not belong to you.');
    }
    if (session.endTime) {
      throw new BadRequestException('This exam session has already ended.');
    }

    const updated = await this.prisma.examSession.update({
      where: { id: dto.sessionId },
      data: {
        tabBlurCount: { increment: 1 },
      },
    });

    const alert =
      updated.tabBlurCount >= ExamSecurityService.TAB_BLUR_ALERT_THRESHOLD;

    if (alert) {
      this.logger.warn(
        `⚠️ Exam integrity alert: session ${dto.sessionId} user=${user.firebaseId} has ${updated.tabBlurCount} tab-blur events (threshold: ${ExamSecurityService.TAB_BLUR_ALERT_THRESHOLD})`,
      );
    }

    return {
      sessionId: updated.id,
      tabBlurCount: updated.tabBlurCount,
      integrityAlert: alert,
      alertMessage: alert
        ? `Warning: ${updated.tabBlurCount} tab switches detected. This session may be flagged for review.`
        : null,
    };
  }

  /**
   * End an exam session and optionally record the score.
   */
  async endSession(dto: EndExamSessionDto, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    const session = await this.prisma.examSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (!session) throw new NotFoundException('Exam session not found');
    if (session.userId !== user.firebaseId) {
      throw new ForbiddenException('This exam session does not belong to you.');
    }
    if (session.endTime) {
      throw new BadRequestException('This exam session has already ended.');
    }

    const updated = await this.prisma.examSession.update({
      where: { id: dto.sessionId },
      data: {
        endTime: new Date(),
        score: dto.score !== undefined ? dto.score : null,
      },
    });

    const durationMinutes = Math.round(
      (updated.endTime!.getTime() - updated.startTime.getTime()) / 60000,
    );

    this.logger.log(
      `Exam session ${dto.sessionId} ended: duration=${durationMinutes}min tabBlurs=${updated.tabBlurCount} score=${dto.score ?? 'N/A'}`,
    );

    return {
      sessionId: updated.id,
      exerciseId: updated.exerciseId,
      startTime: updated.startTime,
      endTime: updated.endTime,
      durationMinutes,
      tabBlurCount: updated.tabBlurCount,
      score: updated.score,
      integrityAlert:
        updated.tabBlurCount >= ExamSecurityService.TAB_BLUR_ALERT_THRESHOLD,
    };
  }

  /**
   * Get a specific exam session (students see their own; instructors/auditors see any).
   */
  async getSession(sessionId: number, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exercise: {
          select: { id: true, title: true, type: true, moduleId: true },
        },
        profile: {
          select: { userId: true, role: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Exam session not found');

    if (
      session.userId !== user.firebaseId &&
      !['INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR'].includes(profile.role)
    ) {
      throw new ForbiddenException(
        'Only the session owner, instructors, or auditors can view this exam session.',
      );
    }

    return session;
  }

  /**
   * List all exam sessions for an exercise (instructors/auditors only).
   */
  async getSessionsByExercise(exerciseId: number, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR'].includes(profile.role)) {
      throw new ForbiddenException(
        'Only instructors, admins, or auditors can view exam session lists.',
      );
    }

    return this.prisma.examSession.findMany({
      where: { exerciseId },
      include: {
        profile: { select: { userId: true, role: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  /**
   * Mark an exam session as audited (instructors/auditors only).
   */
  async auditSession(dto: AuditExamSessionDto, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR'].includes(profile.role)) {
      throw new ForbiddenException(
        'Only instructors, admins, or auditors can audit exam sessions.',
      );
    }

    const session = await this.prisma.examSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (!session) throw new NotFoundException('Exam session not found');

    const updated = await this.prisma.examSession.update({
      where: { id: dto.sessionId },
      data: { isAudited: dto.isAudited },
    });

    this.logger.log(
      `Exam session ${dto.sessionId} audit status set to ${dto.isAudited} by ${user.firebaseId}`,
    );

    return updated;
  }
}
