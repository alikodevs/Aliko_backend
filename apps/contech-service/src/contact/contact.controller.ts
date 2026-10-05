import { Controller, Logger, UsePipes, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContactService } from './contact.service';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { ContactInquirySchema } from './contact.validation';

@Controller()
@UseFilters(RpcExceptionFilter)
export class ContactController {
  private readonly logger = new Logger(ContactController.name);
  constructor(private readonly contactService: ContactService) {}

  @MessagePattern({ cmd: 'send_contact_inquiry' })
  @UsePipes(new JoiValidationPipe(ContactInquirySchema))
  async handleContactInquiry(
    @Payload()
    dto: {
      name: string;
      email: string;
      phone: string;
      message: string;
    },
  ) {
    this.logger.log(`Received contact inquiry from: ${dto.email}`);
    try {
      const result: unknown = await this.contactService.sendContactEmail(dto);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to handle contact inquiry from ${dto.email}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
