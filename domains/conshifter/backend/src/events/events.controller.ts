import { Controller, UseGuards, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EventsService } from './events.service';
import { ConshifterProfileGuard } from '../auth/conshifter-profile.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { ConshifterRole } from '../generated/client';

@Controller()
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsService: EventsService) {}

  @MessagePattern({ cmd: 'find_all_events' })
  findAll() {
    this.logger.log('Handling cmd:find_all_events');
    return this.eventsService.findAll();
  }

  @MessagePattern({ cmd: 'find_upcoming_events' })
  findUpcoming() {
    return this.eventsService.findUpcoming();
  }

  @MessagePattern({ cmd: 'find_one_event_by_slug' })
  findOne(@Payload() data: { slug: string }) {
    this.logger.log(`Handling cmd:find_one_event_by_slug for slug: ${data.slug}`);
    return this.eventsService.findOne(data.slug);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'create_event' })
  create(@Payload() data: { dto: any }) {
    this.logger.log('Handling cmd:create_event (Admin)');
    return this.eventsService.create(data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'update_event' })
  update(@Payload() data: { id: string; dto: any }) {
    return this.eventsService.update(data.id, data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'remove_event' })
  remove(@Payload() data: { id: string }) {
    return this.eventsService.remove(data.id);
  }

  @MessagePattern({ cmd: 'register_for_event' })
  register(@Payload() data: { slug: string; data: any }) {
    this.logger.log(`Handling cmd:register_for_event for slug: ${data.slug}`);
    return this.eventsService.registerForEvent(data.slug, data.data);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'get_event_attendees' })
  getAttendees(@Payload() data: { id: string }) {
    this.logger.log(`Handling cmd:get_event_attendees for event ID: ${data.id}`);
    return this.eventsService.getAttendees(data.id);
  }
}
