import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StatsService } from './stats.service';
import { ConshifterProfileGuard } from '../auth/conshifter-profile.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { ConshifterRole } from '../generated/client';

@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @MessagePattern({ cmd: 'find_all_stats' })
  findAll() {
    return this.statsService.findAll();
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'create_stat' })
  create(@Payload() data: { dto: any }) {
    return this.statsService.create(data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'update_stat' })
  update(@Payload() data: { id: string; dto: any }) {
    return this.statsService.update(data.id, data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'remove_stat' })
  remove(@Payload() data: { id: string }) {
    return this.statsService.remove(data.id);
  }
}
