import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CompaniesService } from './companies.service';

@Controller()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @MessagePattern({ cmd: 'get_all_companies' })
  async findAll() {
    return this.companiesService.findAll();
  }

  @MessagePattern({ cmd: 'get_company_by_slug' })
  async findOne(@Payload() idOrSlug: string) {
    return this.companiesService.findOne(idOrSlug);
  }

  @MessagePattern({ cmd: 'create_company' })
  async create(@Payload() data: any) {
    return this.companiesService.create(data);
  }

  @MessagePattern({ cmd: 'update_company' })
  async update(@Payload() data: { id: string } & any) {
    const { id, ...updateData } = data;
    return this.companiesService.update(id, updateData);
  }

  @MessagePattern({ cmd: 'delete_company' })
  async delete(@Payload() id: string) {
    return this.companiesService.delete(id);
  }
}
