import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { VenturesService } from './ventures.service';

@Controller()
export class VenturesController {
  constructor(private readonly venturesService: VenturesService) {}

  @MessagePattern({ cmd: 'get_all_ventures' })
  async findAll() {
    return this.venturesService.findAll();
  }

  @MessagePattern({ cmd: 'get_venture_by_slug' })
  async findOne(@Payload() idOrSlug: string) {
    return this.venturesService.findOne(idOrSlug);
  }

  @MessagePattern({ cmd: 'create_venture' })
  async create(@Payload() data: any) {
    return this.venturesService.create(data);
  }

  @MessagePattern({ cmd: 'update_venture' })
  async update(@Payload() data: { id: string } & any) {
    const { id, ...updateData } = data;
    return this.venturesService.update(id, updateData);
  }

  @MessagePattern({ cmd: 'delete_venture' })
  async delete(@Payload() id: string) {
    return this.venturesService.delete(id);
  }
}
