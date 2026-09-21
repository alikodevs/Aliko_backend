import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DashboardService } from './dashboard.service';
import { ConshifterProfileGuard } from '../auth/conshifter-profile.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { ConshifterRole } from '../generated/client';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'get_dashboard_counts' })
  getCounts() {
    return this.dashboardService.getCounts();
  }
}
