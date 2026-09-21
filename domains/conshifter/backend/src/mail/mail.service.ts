import { Injectable } from '@nestjs/common';
import { MailService as SharedMailService } from '@alikohub/mail';

@Injectable()
export class MailService {
  constructor(private readonly mail: SharedMailService) {}

  async sendRegistrationConfirmation(
    to: string,
    data: { name: string; eventTitle: string; webinarLink?: string },
  ) {
    const subject = `Registration Received: ${data.eventTitle}`;

    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">Registration Received</h2>
        <p>Hello <strong>${data.name}</strong>,</p>
        <p>Thank you for registering for <strong>${data.eventTitle}</strong>.</p>
    `;

    if (data.webinarLink) {
      htmlContent += `
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">Webinar Link:</p>
          <a href="${data.webinarLink}" style="color: #007bff; text-decoration: none;">${data.webinarLink}</a>
          <p style="margin-top: 10px; font-size: 14px; color: #666;">Please save this link to join the event.</p>
        </div>
      `;
    }

    htmlContent += `
        <p>We look forward to having you with us!</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">This is an automated message from Conshifter Africa.</p>
      </div>
    `;

    await this.mail.sendMail({
      to,
      subject,
      html: htmlContent,
      fromName: 'Conshifter Africa',
    });
  }
}
