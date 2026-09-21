import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '@alikohub/mail';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  private renderEmailTemplate({
    badge = 'AlikoHub Consultancy',
    title,
    subtitle,
    bodyHtml,
    footerNote = 'This is an automated notification from AlikoHub Consultancy.',
  }: {
    badge?: string;
    title: string;
    subtitle?: string;
    bodyHtml: string;
    footerNote?: string;
  }): string {
    const logoUrl = 'https://consultancy.alikohub.com/assets/Aliko%20Consultancy%20-%20tbg%20(V)-Ka7f73lb.png';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%);
      color: #ffffff;
      padding: 34px 24px;
      text-align: center;
    }
    .logo-container {
      margin-bottom: 16px;
      text-align: center;
    }
    .logo-img {
      max-height: 54px;
      max-width: 220px;
      height: auto;
      width: auto;
      object-fit: contain;
      vertical-align: middle;
      display: inline-block;
    }
    .badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #e0f2fe;
    }
    .header h1 {
      margin: 12px 0 0 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.3;
      color: #ffffff;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #93c5fd;
    }
    .content {
      padding: 32px 28px;
      color: #334155;
      font-size: 15px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #2563eb;
      border-radius: 10px;
      padding: 20px;
      margin: 24px 0;
    }
    .card-row {
      margin-bottom: 10px;
      font-size: 14px;
      line-height: 1.5;
    }
    .card-row:last-child {
      margin-bottom: 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 28px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      margin-top: 10px;
    }
    .footer {
      text-align: center;
      padding: 24px 20px;
      background: #f8fafc;
      color: #64748b;
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
      line-height: 1.6;
    }
    .footer strong {
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-container">
        <img src="${logoUrl}" alt="AlikoHub Consultancy" class="logo-img" />
      </div>
      <span class="badge">${badge}</span>
      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p><strong>AlikoHub Consultancy</strong> • Educational & Professional Advisory Services</p>
      <p style="margin: 4px 0 0 0;">${footerNote}</p>
      <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} AlikoHub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  async sendEmail(to: string, subject: string, html: string) {
    return this.mailService.sendMail({
      to,
      subject,
      html,
      fromName: 'AlikoHub Consultancy',
    });
  }

  async sendWebinarConfirmation(
    to: string,
    name: string,
    webinarTitle: string,
    webinarUrl: string,
    scheduledAt: Date,
  ) {
    const dateStr = scheduledAt ? new Date(scheduledAt).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }) : 'TBD';

    const bodyHtml = `
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${name}</strong>,</p>
      <p>You have successfully registered for our upcoming consultancy session:</p>
      
      <div class="card">
        <div class="card-row"><strong>Topic:</strong> ${webinarTitle}</div>
        <div class="card-row"><strong>Scheduled At:</strong> ${dateStr}</div>
        <div class="card-row"><strong>Meeting Link:</strong> <a href="${webinarUrl}" style="color: #2563eb; word-break: break-all;">${webinarUrl}</a></div>
      </div>

      <div style="text-align: center; margin: 26px 0;">
        <a href="${webinarUrl}" target="_blank" class="btn">
          🎥 Access Webinar Session
        </a>
      </div>

      <p style="color: #475569; margin-bottom: 0;">We look forward to having you with us. Please ensure you join a few minutes ahead of the scheduled time.</p>
    `;

    const htmlContent = this.renderEmailTemplate({
      badge: 'AlikoHub Consultancy • Webinar',
      title: 'Webinar Registration Confirmed',
      subtitle: webinarTitle,
      bodyHtml,
    });

    return this.sendEmail(
      to,
      `Confirmation: Registration for ${webinarTitle}`,
      htmlContent,
    );
  }

  async sendContactConfirmation(to: string, name: string, subject: string) {
    const bodyHtml = `
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${name}</strong>,</p>
      <p>Thank you for reaching out to <strong>AlikoHub Consultancy</strong>. We have received your inquiry:</p>

      <div class="card">
        <div class="card-row"><strong>Subject:</strong> ${subject}</div>
        <div class="card-row"><strong>Status:</strong> Under Review by Advisory Team</div>
      </div>

      <p style="color: #475569; margin-bottom: 0;">One of our consultants will review your request and get back to you shortly.</p>
    `;

    const htmlContent = this.renderEmailTemplate({
      badge: 'AlikoHub Consultancy • Support',
      title: 'We Received Your Message',
      subtitle: `Inquiry regarding: ${subject}`,
      bodyHtml,
    });

    return this.sendEmail(
      to,
      `Contact Request Received: ${subject}`,
      htmlContent,
    );
  }

  async sendAdminContactNotification(submission: any) {
    const adminEmail =
      this.configService.get('SMTP_USER') || 'info@alikohub.com';

    const bodyHtml = `
      <p style="font-size: 16px; margin-top: 0;">A new contact message has been submitted through the AlikoHub Consultancy portal:</p>
      
      <div class="card">
        <div class="card-row"><strong>Client Name:</strong> ${submission.fullName}</div>
        <div class="card-row"><strong>Email:</strong> <a href="mailto:${submission.email}" style="color: #2563eb;">${submission.email}</a></div>
        <div class="card-row"><strong>Phone:</strong> ${submission.phone || 'N/A'}</div>
        <div class="card-row"><strong>Subject:</strong> ${submission.subject}</div>
      </div>

      <div style="margin: 20px 0;">
        <strong style="color: #1e293b;">Client Message:</strong>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-top: 8px; color: #334155; white-space: pre-wrap; font-size: 14px; border: 1px solid #e2e8f0;">
          ${submission.message}
        </div>
      </div>
    `;

    const htmlContent = this.renderEmailTemplate({
      badge: 'AlikoHub Consultancy • Admin Alert',
      title: 'New Contact Submission',
      subtitle: submission.subject,
      bodyHtml,
      footerNote: 'Internal notification for AlikoHub Consultancy admin team.',
    });

    return this.sendEmail(
      adminEmail,
      `[NEW LEAD] ${submission.subject}`,
      htmlContent,
    );
  }

  async sendBookingConfirmation(booking: any) {
    const bookingDateStr = booking.bookingDate
      ? new Date(booking.bookingDate).toLocaleDateString('en-US', {
          dateStyle: 'full',
        })
      : 'TBD';

    const bookingTimeStr = booking.startTime
      ? new Date(booking.startTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'TBD';

    const bodyHtml = `
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${booking.fullName}</strong>,</p>
      <p>Your advisory consultation booking with <strong>AlikoHub Consultancy</strong> has been successfully confirmed!</p>

      <div class="card">
        <div class="card-row"><strong>Booking Code:</strong> <span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #2563eb;">${booking.bookingCode}</span></div>
        <div class="card-row"><strong>Service / Type:</strong> ${booking.consultationType || 'General'} Consultation</div>
        <div class="card-row"><strong>Date:</strong> ${bookingDateStr}</div>
        <div class="card-row"><strong>Time:</strong> ${bookingTimeStr}</div>
      </div>

      <p style="color: #475569; margin-bottom: 0;">Our consultant will meet you at the scheduled time. Please keep your booking code handy for reference.</p>
    `;

    const htmlContent = this.renderEmailTemplate({
      badge: 'AlikoHub Consultancy • Appointment',
      title: 'Consultation Booking Confirmed',
      subtitle: `Booking Code: ${booking.bookingCode}`,
      bodyHtml,
    });

    return this.sendEmail(
      booking.email,
      `Booking Confirmation: ${booking.bookingCode}`,
      htmlContent,
    );
  }
}
