import { Controller, UsePipes, UseFilters, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ContactsService } from "./contacts.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { JoiValidationPipe } from "../common/pipes/joi-validation.pipe";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { CreateContactSchema, ContactIdSchema } from "./contacts.validation";

@Controller()
@UseFilters(RpcExceptionFilter)
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(private readonly contactsService: ContactsService) {}

  @MessagePattern({ cmd: "alikowash_submit_contact" })
  @UsePipes(new JoiValidationPipe(CreateContactSchema))
  async create(@Payload() dto: CreateContactDto) {
    this.logger.log(`Handling cmd:alikowash_submit_contact from email: ${dto.email}`);
    return await this.contactsService.create(dto);
  }

  @MessagePattern({ cmd: "alikowash_find_all_contacts" })
  async findAll(@Payload() query: any) {
    this.logger.log(`Handling cmd:alikowash_find_all_contacts with query: ${JSON.stringify(query)}`);
    return await this.contactsService.findAll(query);
  }

  @MessagePattern({ cmd: "alikowash_find_contact_by_id" })
  @UsePipes(new JoiValidationPipe(ContactIdSchema))
  async findOne(@Payload() payload: { id: string }) {
    this.logger.log(`Handling cmd:alikowash_find_contact_by_id for ID: ${payload.id}`);
    return await this.contactsService.findOne(payload.id);
  }

  @MessagePattern({ cmd: "alikowash_mark_contact_read" })
  @UsePipes(new JoiValidationPipe(ContactIdSchema))
  async markAsRead(@Payload() payload: { id: string }) {
    return await this.contactsService.markAsRead(payload.id);
  }

  @MessagePattern({ cmd: "alikowash_remove_contact" })
  @UsePipes(new JoiValidationPipe(ContactIdSchema))
  async remove(@Payload() payload: { id: string }) {
    return await this.contactsService.remove(payload.id);
  }
}
