import {
  Controller,
  UseGuards,
  UsePipes,
  Post,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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

  @Post(['certification/generate', 'academy/certification/generate'])
  @MessagePattern('generate_wabon_certificate')
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @UsePipes(new JoiValidationPipe(generateCertificateSchema))
  async generateCertificate(
    @Body() body?: GenerateCertificateDto,
    @Req() req?: any,
    @Payload() payload?: { dto: GenerateCertificateDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Certificate generation data required');
    }
    const targetUserId = dto.userId || user.firebaseId;
    return this.certificationService.generateCertificate(
      targetUserId,
      dto,
      user.firebaseId,
      user.role,
    );
  }

  @Post(['certification/verify', 'academy/certification/verify'])
  @MessagePattern('verify_wabon_certificate')
  @UsePipes(new JoiValidationPipe(verifyCertificateSchema))
  async verifyCertificate(
    @Body() body?: VerifyCertificateDto,
    @Payload() payload?: { dto: VerifyCertificateDto },
  ) {
    const dto = payload?.dto || body;
    if (!dto) {
      throw new BadRequestException('Verification data required');
    }
    return this.certificationService.verifyCertificate(dto);
  }
}
