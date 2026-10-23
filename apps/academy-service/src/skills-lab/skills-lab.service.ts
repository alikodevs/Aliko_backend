import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { CreateCoreSkillDto, RecordSkillCheckoffDto, UpdateSkillCheckoffDto } from './dto';

/**
 * Skills Lab Checkoff Engine (WAC 246-841A Req 1, 8, 9).
 *
 * Manages the 22+ core nursing assistant skills required by Washington State.
 * Each skill has step-by-step criteria and requires an approved RN instructor
 * sign-off with date, pass/fail, and optional comments.
 */
@Injectable()
export class SkillsLabService {
  private readonly logger = new Logger(SkillsLabService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * Create a core skill definition (Admin/Instructor only).
   */
  async createCoreSkill(dto: CreateCoreSkillDto, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['ADMIN', 'INSTRUCTOR'].includes(profile.role)) {
      throw new ForbiddenException('Only admins or instructors can define core skills.');
    }

    // Ensure unique skill number
    const existing = await this.prisma.coreSkill.findUnique({
      where: { skillNumber: dto.skillNumber },
    });
    if (existing) {
      throw new ConflictException(`Skill number "${dto.skillNumber}" already exists.`);
    }

    const skill = await this.prisma.coreSkill.create({
      data: {
        skillNumber: dto.skillNumber,
        name: dto.name,
        category: dto.category,
        steps: dto.steps,
      },
    });

    this.logger.log(`Core skill "${skill.skillNumber}: ${skill.name}" created by ${user.firebaseId}`);
    return skill;
  }

  /**
   * List all core skill definitions.
   */
  async listAllSkills() {
    return this.prisma.coreSkill.findMany({
      orderBy: { skillNumber: 'asc' },
      include: {
        _count: { select: { checkoffs: true } },
      },
    });
  }

  /**
   * Get a core skill with its checkoff criteria.
   */
  async getSkill(skillId: number) {
    const skill = await this.prisma.coreSkill.findUnique({
      where: { id: skillId },
      include: {
        _count: { select: { checkoffs: true } },
      },
    });
    if (!skill) throw new NotFoundException('Core skill not found');
    return skill;
  }

  /**
   * Record an instructor checkoff for a student's skill performance.
   * Only approved RN instructors may sign off (WAC Req 9).
   */
  async recordCheckoff(dto: RecordSkillCheckoffDto, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['ADMIN', 'INSTRUCTOR'].includes(profile.role)) {
      throw new ForbiddenException('Only approved RN instructors can sign off skill checkoffs.');
    }

    // Verify the instructor has valid WABON credentials
    const credential = await this.prisma.instructorCredential.findUnique({
      where: { userId: user.firebaseId },
    });
    if (!credential) {
      throw new ForbiddenException(
        'Instructor WABON credentials not on file. Please register your RN license before signing off skills.',
      );
    }
    if (credential.rnLicenseExpiration < new Date()) {
      throw new ForbiddenException(
        'Instructor RN license has expired. Skill checkoffs require a current license.',
      );
    }

    // Verify skill exists
    const skill = await this.prisma.coreSkill.findUnique({
      where: { id: dto.skillId },
    });
    if (!skill) throw new NotFoundException('Core skill not found');

    // Verify student is enrolled in the cohort
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId: dto.studentUserId, cohortId: dto.cohortId, status: 'ACTIVE' },
    });
    if (!enrollment) {
      throw new NotFoundException('Student is not actively enrolled in the specified cohort.');
    }

    // Create or update the checkoff record
    const checkoff = await this.prisma.skillCheckoff.create({
      data: {
        skillId: dto.skillId,
        userId: dto.studentUserId,
        instructorId: user.firebaseId,
        cohortId: dto.cohortId,
        passed: dto.passed,
        attempts: dto.attempts || 1,
        comments: dto.comments || null,
      },
      include: {
        skill: true,
        student: {
          select: { userId: true, role: true },
        },
      },
    });

    this.logger.log(
      `Skill checkoff: ${skill.skillNumber} for student ${dto.studentUserId} — ${dto.passed ? 'PASSED' : 'FAILED'} (attempt ${dto.attempts || 1}) by instructor ${user.firebaseId}`,
    );

    return checkoff;
  }

  /**
   * Update an existing checkoff record (e.g., re-test pass).
   */
  async updateCheckoff(
    checkoffId: number,
    dto: UpdateSkillCheckoffDto,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['ADMIN', 'INSTRUCTOR'].includes(profile.role)) {
      throw new ForbiddenException('Only instructors or admins can update skill checkoffs.');
    }

    const checkoff = await this.prisma.skillCheckoff.findUnique({
      where: { id: checkoffId },
    });
    if (!checkoff) throw new NotFoundException('Skill checkoff not found');

    const updateData: Record<string, any> = {};
    if (dto.passed !== undefined) updateData.passed = dto.passed;
    if (dto.attempts !== undefined) updateData.attempts = dto.attempts;
    if (dto.comments !== undefined) updateData.comments = dto.comments;

    const updated = await this.prisma.skillCheckoff.update({
      where: { id: checkoffId },
      data: updateData,
      include: {
        skill: true,
        student: { select: { userId: true, role: true } },
      },
    });

    this.logger.log(`Skill checkoff ${checkoffId} updated by ${user.firebaseId}`);
    return updated;
  }

  /**
   * Get a student's complete skills checkoff matrix.
   * Shows all 22+ skills with pass/fail status for a given cohort.
   */
  async getStudentSkillsMatrix(
    studentUserId: string,
    cohortId: number,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);

    // Students can only view their own; instructors/admins/auditors can view any
    if (
      studentUserId !== user.firebaseId &&
      !['INSTRUCTOR', 'ADMIN', 'COMMISSION_AUDITOR'].includes(profile.role)
    ) {
      throw new ForbiddenException(
        "Only instructors, admins, or auditors can view other students' skill records.",
      );
    }

    const allSkills = await this.prisma.coreSkill.findMany({
      orderBy: { skillNumber: 'asc' },
    });

    const checkoffs = await this.prisma.skillCheckoff.findMany({
      where: { userId: studentUserId, cohortId },
      include: {
        skill: true,
        instructor: { select: { userId: true } },
      },
      orderBy: { checkoffDate: 'desc' },
    });

    const checkoffMap = new Map<number, typeof checkoffs[0]>();
    // Keep only the most recent checkoff per skill
    for (const c of checkoffs) {
      if (!checkoffMap.has(c.skillId)) {
        checkoffMap.set(c.skillId, c);
      }
    }

    const matrix = allSkills.map((skill) => {
      const checkoff = checkoffMap.get(skill.id);
      return {
        skillId: skill.id,
        skillNumber: skill.skillNumber,
        name: skill.name,
        category: skill.category,
        status: checkoff ? (checkoff.passed ? 'PASSED' : 'FAILED') : 'NOT_ATTEMPTED',
        attempts: checkoff?.attempts || 0,
        checkoffDate: checkoff?.checkoffDate || null,
        instructorId: checkoff?.instructorId || null,
        comments: checkoff?.comments || null,
      };
    });

    const passedCount = matrix.filter((s) => s.status === 'PASSED').length;

    return {
      studentUserId,
      cohortId,
      totalSkills: allSkills.length,
      passedSkills: passedCount,
      remainingSkills: allSkills.length - passedCount,
      completionPercent: allSkills.length > 0
        ? Math.round((passedCount / allSkills.length) * 100)
        : 0,
      allPassed: passedCount === allSkills.length,
      skills: matrix,
    };
  }
}
