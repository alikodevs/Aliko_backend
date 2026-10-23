import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import {
  RegisterInstructorCredentialDto,
  UpdateInstructorCredentialDto,
  ApproveInstructorDto,
} from './dto';

/**
 * Instructor WABON Credential Manager (WAC 246-841A Req 9).
 *
 * Manages RN instructor credentials required by the Washington State
 * Nursing Commission:
 *   - Active RN license with expiration tracking
 *   - Long-term care experience (minimum years)
 *   - Train-the-Trainer certification
 *   - WABON approval letter
 *   - Program Director approval sign-off
 */
@Injectable()
export class InstructorsService {
  private readonly logger = new Logger(InstructorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * Register or create instructor WABON credentials.
   * Only the instructor themselves or an admin can register.
   */
  async registerCredential(
    dto: RegisterInstructorCredentialDto,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['ADMIN', 'INSTRUCTOR'].includes(profile.role)) {
      throw new ForbiddenException(
        'Only instructors or admins can register WABON credentials.',
      );
    }

    // Check for existing credential
    const existing = await this.prisma.instructorCredential.findUnique({
      where: { userId: user.firebaseId },
    });
    if (existing) {
      throw new ConflictException(
        'Credentials already exist for this instructor. Use update instead.',
      );
    }

    // Validate license expiration is in the future
    const expDate = new Date(dto.rnLicenseExpiration);
    if (expDate < new Date()) {
      throw new BadRequestException(
        'RN license expiration date must be in the future.',
      );
    }

    const credential = await this.prisma.instructorCredential.create({
      data: {
        userId: user.firebaseId,
        rnLicenseNumber: dto.rnLicenseNumber,
        rnLicenseExpiration: expDate,
        yearsLongTermCareExp: dto.yearsLongTermCareExp,
        trainTheTrainerCertUrl: dto.trainTheTrainerCertUrl || null,
        wabonApprovalLetterUrl: dto.wabonApprovalLetterUrl || null,
      },
    });

    this.logger.log(
      `Instructor credentials registered for ${user.firebaseId}: RN#${dto.rnLicenseNumber}`,
    );
    return credential;
  }

  /**
   * Update existing instructor credentials.
   */
  async updateCredential(
    dto: UpdateInstructorCredentialDto,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['ADMIN', 'INSTRUCTOR'].includes(profile.role)) {
      throw new ForbiddenException(
        'Only instructors or admins can update WABON credentials.',
      );
    }

    const existing = await this.prisma.instructorCredential.findUnique({
      where: { userId: user.firebaseId },
    });
    if (!existing) {
      throw new NotFoundException(
        'No credentials found. Please register first.',
      );
    }

    const updateData: Record<string, any> = {};
    if (dto.rnLicenseNumber !== undefined) updateData.rnLicenseNumber = dto.rnLicenseNumber;
    if (dto.rnLicenseExpiration !== undefined) {
      const expDate = new Date(dto.rnLicenseExpiration);
      if (expDate < new Date()) {
        throw new BadRequestException('RN license expiration date must be in the future.');
      }
      updateData.rnLicenseExpiration = expDate;
    }
    if (dto.yearsLongTermCareExp !== undefined) updateData.yearsLongTermCareExp = dto.yearsLongTermCareExp;
    if (dto.trainTheTrainerCertUrl !== undefined) updateData.trainTheTrainerCertUrl = dto.trainTheTrainerCertUrl;
    if (dto.wabonApprovalLetterUrl !== undefined) updateData.wabonApprovalLetterUrl = dto.wabonApprovalLetterUrl;

    const updated = await this.prisma.instructorCredential.update({
      where: { userId: user.firebaseId },
      data: updateData,
    });

    this.logger.log(`Instructor credentials updated for ${user.firebaseId}`);
    return updated;
  }

  /**
   * Get an instructor's WABON credentials.
   * Instructors see their own; admins/auditors can view any.
   */
  async getCredential(instructorUserId: string, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (
      instructorUserId !== user.firebaseId &&
      !['ADMIN', 'COMMISSION_AUDITOR'].includes(profile.role)
    ) {
      throw new ForbiddenException(
        "Only the instructor themselves, admins, or auditors can view credentials.",
      );
    }

    const credential = await this.prisma.instructorCredential.findUnique({
      where: { userId: instructorUserId },
      include: {
        profile: {
          select: {
            userId: true,
            role: true,
            bio: true,
            expertise: true,
            certifications: true,
          },
        },
      },
    });

    if (!credential) {
      throw new NotFoundException('No WABON credentials found for this instructor.');
    }

    const isExpired = credential.rnLicenseExpiration < new Date();
    const daysUntilExpiry = Math.ceil(
      (credential.rnLicenseExpiration.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      ...credential,
      isLicenseExpired: isExpired,
      daysUntilExpiry: isExpired ? 0 : daysUntilExpiry,
      isDirectorApproved: !!credential.approvedByDirectorAt,
      complianceStatus: this.getComplianceStatus(credential),
    };
  }

  /**
   * Program Director approval sign-off (Admin only).
   */
  async approveInstructor(dto: ApproveInstructorDto, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (profile.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only program directors (ADMIN) can approve instructor credentials.',
      );
    }

    const credential = await this.prisma.instructorCredential.findUnique({
      where: { userId: dto.instructorUserId },
    });
    if (!credential) {
      throw new NotFoundException('No WABON credentials found for this instructor.');
    }

    if (credential.rnLicenseExpiration < new Date()) {
      throw new BadRequestException(
        'Cannot approve instructor with an expired RN license.',
      );
    }

    const updated = await this.prisma.instructorCredential.update({
      where: { userId: dto.instructorUserId },
      data: { approvedByDirectorAt: new Date() },
    });

    this.logger.log(
      `Instructor ${dto.instructorUserId} approved by director ${user.firebaseId}`,
    );
    return updated;
  }

  /**
   * List all instructors with their credential status (Admin/Auditor only).
   */
  async listAllInstructors(user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    if (!['ADMIN', 'COMMISSION_AUDITOR'].includes(profile.role)) {
      throw new ForbiddenException(
        'Only admins or auditors can list all instructor credentials.',
      );
    }

    const credentials = await this.prisma.instructorCredential.findMany({
      include: {
        profile: {
          select: {
            userId: true,
            role: true,
            bio: true,
            expertise: true,
            specialization: true,
          },
        },
      },
      orderBy: { rnLicenseExpiration: 'asc' },
    });

    return credentials.map((c) => ({
      ...c,
      isLicenseExpired: c.rnLicenseExpiration < new Date(),
      isDirectorApproved: !!c.approvedByDirectorAt,
      complianceStatus: this.getComplianceStatus(c),
    }));
  }

  // ── Helpers ──────────────────────────────────────────────────

  private getComplianceStatus(credential: {
    rnLicenseExpiration: Date;
    approvedByDirectorAt: Date | null;
    trainTheTrainerCertUrl: string | null;
    wabonApprovalLetterUrl: string | null;
  }): string {
    if (credential.rnLicenseExpiration < new Date()) return 'LICENSE_EXPIRED';
    if (!credential.approvedByDirectorAt) return 'PENDING_DIRECTOR_APPROVAL';
    if (!credential.trainTheTrainerCertUrl) return 'MISSING_TRAIN_THE_TRAINER';
    if (!credential.wabonApprovalLetterUrl) return 'MISSING_WABON_LETTER';
    return 'FULLY_COMPLIANT';
  }
}
