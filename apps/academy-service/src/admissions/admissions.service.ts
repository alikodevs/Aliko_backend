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
  SubmitAdmissionsApplicationDto,
  SignEnrollmentAgreementDto,
  ReviewAdmissionsApplicationDto,
} from './dto';
import { ApprovalStatus, EnrollmentStatus } from '@prisma/client/academy';

@Injectable()
export class AdmissionsService {
  private readonly logger = new Logger(AdmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async submitApplication(
    dto: SubmitAdmissionsApplicationDto,
    user: AuthenticatedUser,
  ) {
    await this.userService.getOrCreateProfile(user);
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: dto.cohortId },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    const application = await this.prisma.studentAdmissionsApplication.upsert({
      where: {
        userId_cohortId: {
          userId: user.firebaseId,
          cohortId: dto.cohortId,
        },
      },
      update: {
        backgroundCheckUrl: dto.backgroundCheckUrl,
        tbTestProofUrl: dto.tbTestProofUrl,
        immunizationProofUrl: dto.immunizationProofUrl,
        cprCertUrl: dto.cprCertUrl,
        idDocUrl: dto.idDocUrl,
        highSchoolProofUrl: dto.highSchoolProofUrl,
        status: ApprovalStatus.PENDING,
        updatedAt: new Date(),
      },
      create: {
        userId: user.firebaseId,
        cohortId: dto.cohortId,
        backgroundCheckUrl: dto.backgroundCheckUrl,
        tbTestProofUrl: dto.tbTestProofUrl,
        immunizationProofUrl: dto.immunizationProofUrl,
        cprCertUrl: dto.cprCertUrl,
        idDocUrl: dto.idDocUrl,
        highSchoolProofUrl: dto.highSchoolProofUrl,
        status: ApprovalStatus.PENDING,
      },
    });

    this.logger.log(
      `Student ${user.firebaseId} submitted admissions application ${application.id} for cohort ${dto.cohortId}`,
    );
    return application;
  }

  async signEnrollmentAgreement(
    dto: SignEnrollmentAgreementDto,
    user: AuthenticatedUser,
  ) {
    await this.userService.getOrCreateProfile(user);
    const application = await this.prisma.studentAdmissionsApplication.findUnique({
      where: {
        userId_cohortId: {
          userId: user.firebaseId,
          cohortId: dto.cohortId,
        },
      },
    });

    if (!application) {
      throw new NotFoundException(
        'Admissions application must be submitted prior to signing the enrollment agreement.',
      );
    }

    if (!dto.disclosuresAcknowledged) {
      throw new BadRequestException(
        'You must acknowledge all statutory disclosures (DSHS disqualifying crimes, refund policy, physical demands) under WAC 246-841A.',
      );
    }

    const updated = await this.prisma.studentAdmissionsApplication.update({
      where: { id: application.id },
      data: {
        agreementSigned: true,
        agreementSignedAt: new Date(),
        agreementSignatureUrl: dto.signatureUrl,
        disclosuresAcknowledged: true,
      },
    });

    this.logger.log(
      `Student ${user.firebaseId} signed enrollment agreement for cohort ${dto.cohortId}`,
    );
    return updated;
  }

  async reviewApplication(
    dto: ReviewAdmissionsApplicationDto,
    user: AuthenticatedUser,
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const application = await this.prisma.studentAdmissionsApplication.findUnique({
      where: { id: dto.applicationId },
      include: {
        cohort: {
          include: { course: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Admissions application not found');
    }

    const isInstructor =
      application.cohort.course.instructorId === user.firebaseId ||
      application.cohort.assignedInstructorIds?.includes(user.firebaseId);
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'Only program directors, course instructors, or admins can review admissions applications.',
      );
    }

    const updated = await this.prisma.studentAdmissionsApplication.update({
      where: { id: dto.applicationId },
      data: {
        status: dto.status,
        reviewedBy: user.firebaseId,
        reviewedAt: new Date(),
        rejectionReason: dto.rejectionReason || null,
      },
    });

    // If approved, also approve the corresponding enrollment if exists
    if (dto.status === ApprovalStatus.APPROVED) {
      await this.prisma.enrollment.updateMany({
        where: {
          userId: application.userId,
          cohortId: application.cohortId,
        },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          status: EnrollmentStatus.ACTIVE,
        },
      });
      this.logger.log(
        `Admissions application ${application.id} APPROVED by ${user.firebaseId}. Student enrollment activated.`,
      );
    }

    return updated;
  }

  async getMyApplication(cohortId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);
    return this.prisma.studentAdmissionsApplication.findUnique({
      where: {
        userId_cohortId: {
          userId: user.firebaseId,
          cohortId,
        },
      },
      include: {
        cohort: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
      },
    });
  }

  async getCohortApplications(cohortId: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: { course: true },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    const isInstructor =
      cohort.course.instructorId === user.firebaseId ||
      cohort.assignedInstructorIds?.includes(user.firebaseId);
    const isAdmin = academyProfile.role === 'ADMIN';
    const isAuditor = academyProfile.role === 'COMMISSION_AUDITOR';

    if (!isInstructor && !isAdmin && !isAuditor) {
      throw new ForbiddenException(
        'You do not have permission to view admissions applications for this cohort.',
      );
    }

    return this.prisma.studentAdmissionsApplication.findMany({
      where: { cohortId },
      include: {
        profile: {
          select: { userId: true, role: true, specialization: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
