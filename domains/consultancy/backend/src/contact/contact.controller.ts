import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { Prisma } from '../generated/client';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { resolvePayload, resolveParam } from '../common/utils/payload-resolver.util';

@Controller('contact-submissions')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @MessagePattern({ cmd: 'create_contact_submission' })
  @Post()
  create(
    @Body() data: Prisma.ContactSubmissionCreateInput,
    @Payload() payload: Prisma.ContactSubmissionCreateInput,
  ) {
    return this.contactService.create(resolvePayload(data, payload));
  }

  @MessagePattern({ cmd: 'get_all_contacts' })
  @Get()
  findAll() {
    return this.contactService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_contact' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: Prisma.ContactSubmissionUpdateInput,
    @Payload() payload: any,
  ) {
    const targetId = resolveParam(id, payload?.id);
    const resolvedData = resolvePayload(data, payload?.data || payload);
    const { id: ignoredId, ...updateFields } = resolvedData || {};
    return this.contactService.update(targetId, updateFields);
  }

  @MessagePattern({ cmd: 'remove_contact' })
  @Delete(':id')
  remove(@Param('id') id: string, @Payload() payload: any) {
    const targetId = resolveParam(id, payload?.id);
    return this.contactService.remove(targetId);
  }
}
