import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContentService } from './content.service';

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @MessagePattern({ cmd: 'get_all_content' })
  async findAll(@Payload() data: { all?: string }) {
    const publishedOnly = data?.all !== 'true';
    return this.contentService.findAll(publishedOnly);
  }

  @MessagePattern({ cmd: 'get_content_by_slug' })
  async findOne(@Payload() slug: string) {
    return this.contentService.findOne(slug);
  }

  @MessagePattern({ cmd: 'create_content' })
  async create(@Payload() data: any) {
    return this.contentService.create(data);
  }

  @MessagePattern({ cmd: 'update_content' })
  async update(@Payload() data: { id: string } & any) {
    const { id, ...updateData } = data;
    return this.contentService.update(id, updateData);
  }
}
