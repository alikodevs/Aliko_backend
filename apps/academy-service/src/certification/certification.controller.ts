import { Controller, UseGuards, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CertificationService } from './certification.service';
import { GenerateCertificateDto, VerifyCertificateDto } from './dto';
import {
  generateCertificateSchema,
  verifyCertificateSchema,
} from './certification.validation';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { AuthenticatedUser } from '../user/user.service';

@Controller()
export class CertificationController {
  constructor(private readonly certificationService: CertificationService) {}

  @MessagePattern('generate_wabon_certificate')
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @UsePipes(new JoiValidationPipe(generateCertificateSchema))
  async generateCertificate(
    @Payload() payload: { dto: GenerateCertificateDto; user: AuthenticatedUser },
  ) {
    const targetUserId = payload.dto.userId || payload.user.firebaseId;
    return this.certificationService.generateCertificate(
      targetUserId,
      payload.dto,
      payload.user.firebaseId,
      payload.user.role,
    );
  }

  @MessagePattern('verify_wabon_certificate')
  @UsePipes(new JoiValidationPipe(verifyCertificateSchema))
  async verifyCertificate(@Payload() payload: { dto: VerifyCertificateDto }) {
    return this.certificationService.verifyCertificate(payload.dto);
  }
}
