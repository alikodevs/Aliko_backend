import {
  Body,
  Controller,
  Inject,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Contact')
@Controller('contech/contact')
export class ContactController {
  constructor(@Inject('CONTECH_SERVICE') private contechClient: ClientProxy) {}

  @ApiOperation({ summary: 'Submit contact form' })
  @ApiResponse({ status: 201, description: 'Contact form submitted' })
  @Post()
  submitContact(@Body() dto: any) {
    return this.contechClient.send({ cmd: 'send_contact_inquiry' }, dto);
  }
}
