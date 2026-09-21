import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type SendMailOptions = {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      const cleanPass = smtpPass.replace(/^"(.*)"$/, '$1');
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465,
        auth: { user: smtpUser, pass: cleanPass },
        tls: { rejectUnauthorized: false },
      });
      this.logger.log('SMTP transporter initialized successfully');
    } else {
      this.logger.warn(
        'SMTP configuration not found. Email sending will be simulated.',
      );
    }
  }

  async sendMail(options: SendMailOptions): Promise<boolean> {
    const fromEmail =
      options.fromEmail || process.env.SMTP_FROM || 'noreply@alikohub.com';
    const fromName = options.fromName || 'AlikoHub';

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
        this.logger.log(
          `Email sent successfully to ${options.to}. MessageId: ${info.messageId}`,
        );
        return true;
      } catch (error: any) {
        this.logger.error(
          `Failed to send email to ${options.to}: ${error.message}`,
        );
        return false;
      }
    }

    this.logger.log(`[SIMULATED EMAIL] To: ${options.to}`);
    this.logger.log(`[SIMULATED EMAIL] Subject: ${options.subject}`);
    this.logger.log(
      `[SIMULATED EMAIL] Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS to enable real emails.`,
    );
    return true;
  }
}
