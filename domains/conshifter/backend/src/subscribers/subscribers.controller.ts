import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SubscribersService } from './subscribers.service';
import { ConshifterProfileGuard } from '../auth/conshifter-profile.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { ConshifterRole } from '../generated/client';

@Controller()
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @MessagePattern({ cmd: 'subscribe_newsletter' })
  subscribe(@Payload() data: { dto: any }) {
    return this.subscribersService.subscribe(data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'find_all_subscribers' })
  findAll() {
    return this.subscribersService.findAll();
  }
}
