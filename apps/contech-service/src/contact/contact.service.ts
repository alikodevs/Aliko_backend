import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(@Inject('AUTH_SERVICE') private authClient: ClientProxy) {}

  async sendContactEmail(dto: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }) {
    this.logger.log(
      `Forwarding contact inquiry from ${dto.email} to Auth Service`,
    );
    try {
      const result: unknown = await firstValueFrom(
        this.authClient.send({ cmd: 'send_contact_email' }, dto),
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send contact email to Auth Service: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
