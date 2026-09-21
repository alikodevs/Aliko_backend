import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '@alikohub/mail';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmail(to: string, subject: string, html: string) {
    return this.mailService.sendMail({
      to,
      subject,
      html,
      fromName: 'Alikowash',
    });
  }

  async sendContactConfirmation(to: string, name: string) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0F52BA;">Thank you for contacting Alikowash!</h2>
        <p>Hi ${name},</p>
        <p>We've received your message and our team will get back to you as soon as possible.</p>
        <p>Best regards,<br>The Alikowash Team</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated message from Alikowash.</p>
      </div>
    `;

    return this.sendEmail(
      to,
      `Contact Request Received - Alikowash`,
      htmlContent,
    );
  }

  async sendAdminContactNotification(submission: any) {
    const adminEmail =
      this.configService.get('SMTP_USER') || 'admin@alikowash.com';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0F52BA;">New Contact Inquiry - Alikowash</h2>
        <p><strong>From:</strong> ${submission.name} (${submission.email})</p>
        <p><strong>Organization:</strong> ${submission.organization || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          ${submission.message}
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">New lead from Alikowash contact form.</p>
      </div>
    `;

    return this.sendEmail(
      adminEmail,
      `[NEW LEAD] Alikowash Inquiry from ${submission.name}`,
      htmlContent,
    );
  }
}
