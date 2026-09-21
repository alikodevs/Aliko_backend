import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TestimonialsService } from './testimonials.service';
import { ConshifterProfileGuard } from '../auth/conshifter-profile.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { ConshifterRole } from '../generated/client';

@Controller()
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @MessagePattern({ cmd: 'find_all_testimonials' })
  findAll() {
    return this.testimonialsService.findAll();
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'find_all_testimonials_admin' })
  findAllAdmin() {
    return this.testimonialsService.findAllAdmin();
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'create_testimonial' })
  create(@Payload() data: { dto: any }) {
    return this.testimonialsService.create(data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'update_testimonial' })
  update(@Payload() data: { id: string; dto: any }) {
    return this.testimonialsService.update(data.id, data.dto);
  }

  @UseGuards(ConshifterProfileGuard, RoleGuard)
  @Roles(ConshifterRole.ADMIN)
  @MessagePattern({ cmd: 'remove_testimonial' })
  remove(@Payload() data: { id: string }) {
    return this.testimonialsService.remove(data.id);
  }
}
