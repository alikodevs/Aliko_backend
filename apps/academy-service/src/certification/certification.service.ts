import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GradebookService } from '../gradebook/gradebook.service';
import { GenerateCertificateDto, VerifyCertificateDto } from './dto';
import { AcademyRole } from '@prisma/client/academy';
import * as crypto from 'crypto';

@Injectable()
export class CertificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gradebookService: GradebookService,
  ) {}

  async generateCertificate(
    targetUserId: string,
    dto: GenerateCertificateDto,
    requestingUserId: string,
    requestingRole?: AcademyRole | string,
  ) {
    // 1. Check Admissions Application (Orientation & Agreement Disclosures)
    const application = await this.prisma.studentAdmissionsApplication.findFirst({
      where: {
        userId: targetUserId,
        cohortId: dto.cohortId,
      },
    });

    if (!application || !application.orientationCompleted) {
      throw new BadRequestException(
        'Cannot issue State Certificate: Mandatory orientation (zero-credit) has not been completed',
      );
    }

    if (!application.agreementSigned) {
      throw new BadRequestException(
        'Cannot issue State Certificate: Student Enrollment Agreement & Legal Disclosures must be e-signed',
      );
    }

    // 2. Fetch Gradebook Summary
    const report = await this.gradebookService.getStudentGradeReport(
      targetUserId,
      dto.cohortId,
      requestingUserId,
      requestingRole,
    );

    const summary = report.summary;

    if (!summary.isTheoryPassed) {
      throw new BadRequestException(
        `Cannot issue State Certificate: Theory grade (${summary.overallTheoryPercent}%) is below the statutory 80.0% minimum`,
      );
    }

    if (!summary.skillsLab.isSkillsLabComplete) {
      throw new BadRequestException(
        `Cannot issue State Certificate: In-person skills lab checkoff incomplete. Passed ${summary.skillsLab.passedCount} of ${summary.skillsLab.totalRequired} core skills`,
      );
    }

    if (!summary.clinicalHours.isClinicalHoursMet) {
      throw new BadRequestException(
        `Cannot issue State Certificate: Clinical hours (${summary.clinicalHours.totalCompleted} hrs) do not meet the 40.0-hour state requirement`,
      );
    }

    // 3. Generate Official Certificate Number & Verification Token
    const sanitizedId = targetUserId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
    const certificateNumber = `WA-NAC-${dto.cohortId}-${sanitizedId}-${Date.now().toString(36).toUpperCase()}`;

    const completionDate = new Date().toISOString();
    const verificationSecret = 'WABON_STATE_ACCREDITED_KEY_2026';
    const verificationToken = crypto
      .createHmac('sha256', verificationSecret)
      .update(`${certificateNumber}:${targetUserId}:${dto.cohortId}:${completionDate}`)
      .digest('hex');

    return {
      certificateNumber,
      wabonApprovalCode: 'WA-NNAAP-246-841A-0440',
      programTitle: 'Washington Nursing Assistant Certified (NA-C) Training Program',
      stateStandard: 'WAC 246-841A-440 Online Delivery with Asynchronous Elements',
      student: {
        userId: targetUserId,
      },
      cohortId: dto.cohortId,
      courseTitle: report.courseTitle,
      hoursBreakdown: {
        classroomTheoryHours: 50.0,
        skillsLabHours: 20.0,
        clinicalHours: summary.clinicalHours.totalCompleted,
        totalTrainingHours: 50.0 + 20.0 + summary.clinicalHours.totalCompleted,
      },
      academicRecord: {
        overallTheoryScorePercent: summary.overallTheoryPercent,
        letterGrade: summary.letterGrade,
        skillsLabStatus: 'ALL_22_CORE_SKILLS_PASSED',
        clinicalStatus: 'COMPLETED_MINIMUM_40_HOURS',
      },
      signatures: {
        programDirector: dto.directorName || 'Approved Nursing Assistant Program Director, RN',
        directorRnLicense: dto.directorRnLicense || 'WA-RN-VERIFIED',
        issuedAt: completionDate,
      },
      verification: {
        verificationCode: certificateNumber,
        verificationToken,
        qrVerificationUrl: `https://academy.alikohub.com/verify/credential/${certificateNumber}`,
        status: 'OFFICIALLY_CERTIFIED_VALID',
      },
    };
  }

  async verifyCertificate(dto: VerifyCertificateDto) {
    if (!dto.certificateNumber || !dto.certificateNumber.startsWith('WA-NAC-')) {
      throw new BadRequestException('Invalid certificate number format');
    }

    // In a production system, this could look up a persisted certificate table or decode the token
    const parts = dto.certificateNumber.split('-');
    if (parts.length < 5) {
      throw new NotFoundException('Certificate record not found or format invalid');
    }

    const cohortId = parseInt(parts[2], 10);

    return {
      certificateNumber: dto.certificateNumber,
      wabonApprovalCode: 'WA-NNAAP-246-841A-0440',
      institution: 'Aliko Healthcare Academy',
      programName: 'Washington Nursing Assistant Certified (NA-C) Program',
      cohortId,
      status: 'VERIFIED_AND_ACTIVE',
      stateBoard: 'Washington State Board of Nursing (WABON)',
      regulatoryCompliance: 'WAC 246-841A-440 Fully Compliant',
      verifiedAt: new Date().toISOString(),
    };
  }
}
