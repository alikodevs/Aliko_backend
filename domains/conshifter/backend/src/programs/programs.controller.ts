import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProgramsService } from './programs.service';
import { ConshifterProfileGuard } from '../auth/conshifter-profile.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { ConshifterRole } from '../generated/client';

@Controller()
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @MessagePattern({ cmd: 'find_all_programs' })
  findAll() {
    return this.programsService.findAll();
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'find_all_programs_admin' })
  findAllAdmin() {
    return this.programsService.findAllAdmin();
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'find_one_program_admin' })
  findOneAdmin(@Payload() data: { id: string }) {
    return this.programsService.findOneAdmin(data.id);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'create_program' })
  create(@Payload() data: { dto: any }) {
    return this.programsService.create(data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'update_program' })
  update(@Payload() data: { id: string; dto: any }) {
    return this.programsService.update(data.id, data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'remove_program' })
  remove(@Payload() data: { id: string }) {
    return this.programsService.remove(data.id);
  }
}
