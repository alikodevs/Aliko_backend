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
  CreateClinicalShiftDto,
  RecordClinicalAttendanceDto,
  UpdateClinicalAttendanceDto,
} from './dto';

/**
 * Clinical Shift Tracking Service (WAC 246-841A Req 1, 8, 9, 19).
 *
 * Tracks clinical shifts at long-term care facilities, supervising RN
 * preceptors, student attendance hours toward the 40-hour minimum,
 * and enforces the prerequisite that all lab skill checkoffs must be
 * passed before a student can begin clinical rotations.
 */
@Injectable()
export class ClinicalService {
  private readonly logger = new Logger(ClinicalService.name);
  /** WAC minimum clinical hours requirement */
  private static readonly MIN_CLINICAL_HOURS = 40;
  /** WAC clinical student-to-instructor ratio cap */
  private static readonly MAX_CLINICAL_RATIO = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * Create a clinical shift for a cohort (Instructor/Admin only).
   * Validates the instructor has valid WABON credentials.
   */
  async createShift(dto: CreateClinicalShiftDto, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['ADMIN', 'INSTRUCTOR'].includes(profile.role)) {
      throw new ForbiddenException('Only instructors or admins can create clinical shifts.');
    }

    // Verify cohort exists
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: dto.cohortId },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    // Verify instructor credentials
    const credential = await this.prisma.instructorCredential.findUnique({
      where: { userId: user.firebaseId },
    });
    if (!credential) {
      throw new ForbiddenException(
        'Instructor WABON credentials not on file. Clinical supervision requires an approved RN license.',
      );
    }
    if (credential.rnLicenseExpiration < new Date()) {
      throw new ForbiddenException('Instructor RN license has expired.');
    }

    const shift = await this.prisma.clinicalShift.create({
      data: {
        cohortId: dto.cohortId,
        facilityName: dto.facilityName,
        instructorId: user.firebaseId,
        shiftDate: new Date(dto.shiftDate),
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        hoursCredited: dto.hoursCredited,
      },
      include: {
        instructor: { select: { userId: true, role: true } },
      },
    });

    this.logger.log(
      `Clinical shift created: ${shift.id} at "${dto.facilityName}" on ${dto.shiftDate} by instructor ${user.firebaseId}`,
    );
    return shift;
  }

  /**
   * List all clinical shifts for a cohort.
   */
  async findByCohort(cohortId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    return this.prisma.clinicalShift.findMany({
      where: { cohortId },
      include: {
        instructor: { select: { userId: true, role: true } },
        studentRoster: {
          include: {
            student: { select: { userId: true, role: true } },
          },
        },
        _count: { select: { studentRoster: true } },
      },
      orderBy: { shiftDate: 'asc' },
    });
  }

  /**
   * Get a single clinical shift with full roster.
   */
  async getShift(shiftId: number) {
    const shift = await this.prisma.clinicalShift.findUnique({
      where: { id: shiftId },
      include: {
        instructor: { select: { userId: true, role: true } },
        cohort: { select: { id: true, name: true, courseId: true } },
        studentRoster: {
          include: {
            student: { select: { userId: true, role: true } },
          },
        },
      },
    });
    if (!shift) throw new NotFoundException('Clinical shift not found');
    return shift;
  }

  /**
   * Record student clinical attendance.
   * Enforces:
   *   1. WAC 1:10 clinical ratio cap
   *   2. All lab skill checkoffs must be passed before clinical entry
   */
  async recordAttendance(
    dto: RecordClinicalAttendanceDto,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['ADMIN', 'INSTRUCTOR'].includes(profile.role)) {
      throw new ForbiddenException('Only instructors or admins can record clinical attendance.');
    }

    const shift = await this.prisma.clinicalShift.findUnique({
      where: { id: dto.shiftId },
      include: {
        _count: { select: { studentRoster: true } },
      },
    });
    if (!shift) throw new NotFoundException('Clinical shift not found');

    // Enforce 1:10 clinical ratio
    if (shift._count.studentRoster >= ClinicalService.MAX_CLINICAL_RATIO) {
      throw new BadRequestException(
        `WAC clinical ratio violation: Maximum ${ClinicalService.MAX_CLINICAL_RATIO} students per supervising instructor.`,
      );
    }

    // Verify student enrollment
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId: dto.studentUserId, cohortId: shift.cohortId, status: 'ACTIVE' },
    });
    if (!enrollment) {
      throw new NotFoundException('Student is not actively enrolled in this cohort.');
    }

    // ── Prerequisite Gate: All lab skill checkoffs must be passed ──
    const allSkills = await this.prisma.coreSkill.findMany({
      select: { id: true },
    });
    if (allSkills.length > 0) {
      const passedCheckoffs = await this.prisma.skillCheckoff.findMany({
        where: {
          userId: dto.studentUserId,
          cohortId: shift.cohortId,
          passed: true,
        },
        select: { skillId: true },
      });
      const passedSkillIds = new Set(passedCheckoffs.map((c) => c.skillId));
      const unpassed = allSkills.filter((s) => !passedSkillIds.has(s.id));

      if (unpassed.length > 0) {
        throw new BadRequestException(
          `WAC prerequisite gate: Student must pass all ${allSkills.length} core skills lab checkoffs before clinical entry. ${unpassed.length} skill(s) remaining.`,
        );
      }
    }

    const attendance = await this.prisma.clinicalShiftAttendance.create({
      data: {
        shiftId: dto.shiftId,
        userId: dto.studentUserId,
        hoursCompleted: dto.hoursCompleted,
        competencyNotes: dto.competencyNotes || null,
        passed: dto.passed !== undefined ? dto.passed : true,
        signedBy: user.firebaseId,
      },
      include: {
        shift: {
          select: { facilityName: true, shiftDate: true },
        },
        student: { select: { userId: true, role: true } },
      },
    });

    this.logger.log(
      `Clinical attendance: student ${dto.studentUserId} logged ${dto.hoursCompleted}h at shift ${dto.shiftId} by ${user.firebaseId}`,
    );

    return attendance;
  }

  /**
   * Update an existing clinical attendance record.
   */
  async updateAttendance(
    attendanceId: number,
    dto: UpdateClinicalAttendanceDto,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['ADMIN', 'INSTRUCTOR'].includes(profile.role)) {
      throw new ForbiddenException('Only instructors or admins can update clinical attendance.');
    }

    const record = await this.prisma.clinicalShiftAttendance.findUnique({
      where: { id: attendanceId },
    });
    if (!record) throw new NotFoundException('Clinical attendance record not found');

    const updateData: Record<string, any> = {};
    if (dto.hoursCompleted !== undefined) updateData.hoursCompleted = dto.hoursCompleted;
    if (dto.competencyNotes !== undefined) updateData.competencyNotes = dto.competencyNotes;
    if (dto.passed !== undefined) updateData.passed = dto.passed;

    return this.prisma.clinicalShiftAttendance.update({
      where: { id: attendanceId },
      data: updateData,
      include: {
        shift: { select: { facilityName: true, shiftDate: true } },
        student: { select: { userId: true, role: true } },
      },
    });
  }

  /**
   * Get a student's total clinical hours and progress toward the 40-hour minimum.
   */
  async getStudentClinicalHours(
    studentUserId: string,
    cohortId: number,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (
      studentUserId !== user.firebaseId &&
      !['INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR'].includes(profile.role)
    ) {
      throw new ForbiddenException(
        "Only instructors, admins, or auditors can view other students' clinical hours.",
      );
    }

    const attendances = await this.prisma.clinicalShiftAttendance.findMany({
      where: {
        userId: studentUserId,
        shift: { cohortId },
      },
      include: {
        shift: {
          select: {
            id: true,
            facilityName: true,
            shiftDate: true,
            instructorId: true,
          },
        },
      },
      orderBy: { shift: { shiftDate: 'asc' } },
    });

    const totalHours = attendances.reduce((sum, a) => sum + a.hoursCompleted, 0);
    const passedShifts = attendances.filter((a) => a.passed).length;

    return {
      studentUserId,
      cohortId,
      totalHoursCompleted: totalHours,
      minimumRequired: ClinicalService.MIN_CLINICAL_HOURS,
      hoursRemaining: Math.max(0, ClinicalService.MIN_CLINICAL_HOURS - totalHours),
      meetsMinimum: totalHours >= ClinicalService.MIN_CLINICAL_HOURS,
      completionPercent: Math.min(
        100,
        Math.round((totalHours / ClinicalService.MIN_CLINICAL_HOURS) * 100),
      ),
      totalShifts: attendances.length,
      passedShifts,
      shifts: attendances.map((a) => ({
        attendanceId: a.id,
        shiftId: a.shiftId,
        facilityName: a.shift.facilityName,
        shiftDate: a.shift.shiftDate,
        hoursCompleted: a.hoursCompleted,
        passed: a.passed,
        competencyNotes: a.competencyNotes,
        signedBy: a.signedBy,
      })),
    };
  }
}
