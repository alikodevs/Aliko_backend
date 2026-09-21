import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from '../generated/client';

@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @MessagePattern('careers.applications.create')
  create(@Payload() data: any) {
    return this.applicationsService.create(data);
  }

  @MessagePattern('careers.applications.findAllByUser')
  findAllByUser(@Payload() userId: string) {
    return this.applicationsService.findAllByUser(userId);
  }

  @MessagePattern('careers.applications.findOne')
  findOne(@Payload() id: number) {
    return this.applicationsService.findOne(id);
  }

  @MessagePattern('careers.applications.updateStatus')
  updateStatus(@Payload() data: { id: number; status: ApplicationStatus; adminNotes?: string }) {
    return this.applicationsService.updateStatus(data.id, data.status, data.adminNotes);
  }

  @MessagePattern('careers.applications.findAll')
  findAll() {
    return this.applicationsService.findAll();
  }
}
