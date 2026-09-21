import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApplicationsService } from './applications.service';
import { ConshifterProfileGuard } from '../auth/conshifter-profile.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { ConshifterRole, ApplicationStatus } from '../generated/client';

@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @MessagePattern({ cmd: 'create_application' })
  create(@Payload() data: { dto: any }) {
    return this.applicationsService.create(data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'find_all_applications' })
  findAll() {
    return this.applicationsService.findAll();
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'update_application_status' })
  updateStatus(@Payload() data: { id: string; status: string }) {
    return this.applicationsService.updateStatus(data.id, data.status as ApplicationStatus);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'remove_application' })
  remove(@Payload() data: { id: string }) {
    return this.applicationsService.remove(data.id);
  }
}
