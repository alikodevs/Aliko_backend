import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContactService } from './contact.service';

@Controller()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @MessagePattern({ cmd: 'submit_contact' })
  async submit(@Payload() data: { name: string; email: string; subject?: string; message: string }) {
    return this.contactService.submit(data);
  }

  @MessagePattern({ cmd: 'get_contact_submissions' })
  async findAll() {
    return this.contactService.findAll();
  }

  @MessagePattern({ cmd: 'mark_contact_as_read' })
  async markAsRead(@Payload() id: string) {
    return this.contactService.markAsRead(id);
  }
}
