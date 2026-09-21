import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email.service';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private formatContactData(data: any) {
    const { userId, ...formatted } = data || {};
    if (formatted.consultationType && typeof formatted.consultationType === 'string') {
      formatted.consultationType = formatted.consultationType.toUpperCase();
    }
    return formatted;
  }

  async create(data: any) {
    const formattedData = this.formatContactData(data);
    const submission = await this.prisma.contactSubmission.create({ data: formattedData });

    // Send confirmation email to user
    this.emailService.sendContactConfirmation(
      submission.email,
      submission.fullName,
      submission.subject,
    ).catch(err => console.error('Failed to send contact confirmation:', err));

    // Send notification to admin
    this.emailService.sendAdminContactNotification(submission)
      .catch(err => console.error('Failed to send admin notification:', err));

    return submission;
  }

  async findAll() {
    return this.prisma.contactSubmission.findMany();
  }

  async findOne(id: string) {
    return this.prisma.contactSubmission.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    const formattedData = this.formatContactData(data);
    return this.prisma.contactSubmission.update({ where: { id }, data: formattedData });
  }

  async remove(id: string) {
    return this.prisma.contactSubmission.delete({ where: { id } });
  }
}
