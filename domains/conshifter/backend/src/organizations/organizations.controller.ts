import { Controller, UseGuards, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrganizationsService } from './organizations.service';
import { ConshifterProfileGuard } from '../auth/conshifter-profile.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { ConshifterRole, OrganizationStatus } from '../generated/client';

@Controller()
export class OrganizationsController {
  private readonly logger = new Logger(OrganizationsController.name);

  constructor(private readonly organizationsService: OrganizationsService) {}

  @MessagePattern({ cmd: 'find_all_organizations' })
  findAll() {
    this.logger.log('Handling cmd:find_all_organizations');
    return this.organizationsService.findAll();
  }

  @MessagePattern({ cmd: 'find_one_organization_by_slug' })
  findOne(@Payload() data: { slug: string }) {
    return this.organizationsService.findOne(data.slug);
  }

  @MessagePattern({ cmd: 'create_organization_public' })
  createPublic(@Payload() data: { dto: any }) {
    this.logger.log(`Handling cmd:create_organization_public for: ${data.dto?.name}`);
    return this.organizationsService.createPublic(data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'find_all_organizations_admin' })
  findAllAdmin() {
    return this.organizationsService.findAllAdmin();
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'update_organization_status' })
  updateStatus(@Payload() data: { id: string; status: string }) {
    return this.organizationsService.updateStatus(data.id, data.status as OrganizationStatus);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'remove_organization' })
  remove(@Payload() data: { id: string }) {
    return this.organizationsService.remove(data.id);
  }
}
