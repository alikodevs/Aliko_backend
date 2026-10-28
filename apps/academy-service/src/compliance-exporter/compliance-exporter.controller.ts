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
import { ComplianceExporterService } from './compliance-exporter.service';
import { GenerateComplianceDossierDto } from './dto';
import { generateComplianceDossierSchema } from './compliance-exporter.validation';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { AcademyRole } from '@prisma/client/academy';
import { AuthenticatedUser } from '../user/user.service';

@Controller()
@UseGuards(AcademyProfileGuard, RoleGuard)
export class ComplianceExporterController {
  constructor(private readonly complianceExporterService: ComplianceExporterService) {}

  @Post(['compliance-exporter/dossier', 'academy/compliance-exporter/dossier'])
  @MessagePattern('generate_compliance_dossier')
  @Roles(
    AcademyRole.INSTRUCTOR,
    AcademyRole.COURSE_MANAGER,
    AcademyRole.ADMIN,
    AcademyRole.COMMISSION_AUDITOR,
  )
  @UsePipes(new JoiValidationPipe(generateComplianceDossierSchema))
  async generateDossier(
    @Body() body?: GenerateComplianceDossierDto,
    @Req() req?: any,
    @Payload() payload?: { dto: GenerateComplianceDossierDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Dossier generation parameters required');
    }
    return this.complianceExporterService.generateDossier(dto);
  }
}
