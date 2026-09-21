import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PartnersService } from './partners.service';
import { ConshifterProfileGuard } from '../auth/conshifter-profile.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { ConshifterRole } from '../generated/client';

@Controller()
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @MessagePattern({ cmd: 'find_all_partners' })
  findAll() {
    return this.partnersService.findAll();
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'create_partner' })
  create(@Payload() data: { dto: any }) {
    return this.partnersService.create(data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'update_partner' })
  update(@Payload() data: { id: string; dto: any }) {
    return this.partnersService.update(data.id, data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'remove_partner' })
  remove(@Payload() data: { id: string }) {
    return this.partnersService.remove(data.id);
  }
}
