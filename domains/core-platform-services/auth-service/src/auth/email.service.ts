import { Injectable } from '@nestjs/common';
import { MailService } from '@alikohub/mail';

@Injectable()
export class EmailService {
	constructor(private readonly mailService: MailService) {}

	async sendWelcomeEmail(to: string, firstname: string): Promise<boolean> {
		const subject = 'Welcome to AlikoHub Academy!';
		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Welcome to AlikoHub Academy</title>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
					.content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
					.button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
					.footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>Welcome to AlikoHub Academy!</h1>
					</div>
					<div class="content">
						<p>Hi ${firstname},</p>
						<p>Thank you for joining AlikoHub Academy! We're excited to have you on board.</p>
						<p>With your new account, you can:</p>
						<ul>
							<li>Browse and enroll in courses</li>
							<li>Track your learning progress</li>
							<li>Connect with instructors and other learners</li>
							<li>Earn certificates upon course completion</li>
						</ul>
						<p>Ready to start learning?</p>
						<a href="${process.env.FRONTEND_URL || 'https://lms.alikohub.com'}" class="button">Explore Courses</a>
						<p style="margin-top: 20px;">If you have any questions, feel free to reach out to our support team.</p>
						<p>Happy learning!</p>
						<p>The AlikoHub Academy Team</p>
					</div>
					<div class="footer">
						<p>&copy; ${new Date().getFullYear()} AlikoHub. All rights reserved.</p>
					</div>
				</div>
			</body>
			</html>
		`;

		return this.sendEmail(to, subject, htmlContent);
	}

	async sendPasswordResetEmail(to: string, firstname: string, resetLink: string): Promise<boolean> {
		const subject = 'Reset Your Aliko Password';
		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Reset Your Password</title>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
					.content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
					.button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
					.footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>Reset Your Password</h1>
					</div>
					<div class="content">
						<p>Hi ${firstname || 'there'},</p>
						<p>We received a request to reset your password. Click the button below to set a new password:</p>
						<a href="${resetLink}" class="button">Reset Password</a>
						<p style="margin-top: 20px;">This link will expire in 1 hour.</p>
						<p>If you didn't request a password reset, you can safely ignore this email.</p>
						<p>Best regards,</p>
						<p>The Aliko Team</p>
					</div>
					<div class="footer">
						<p>&copy; ${new Date().getFullYear()} AlikoHub. All rights reserved.</p>
					</div>
				</div>
			</body>
			</html>
		`;

		return this.sendEmail(to, subject, htmlContent);
	}

	async sendVerificationEmail(to: string, firstname: string, verificationLink: string): Promise<boolean> {
		const subject = 'Verify Your AlikoHub Academy Email';
		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Verify Your Email</title>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
					.content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
					.button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
					.footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>Verify Your Email</h1>
					</div>
					<div class="content">
						<p>Hi ${firstname},</p>
						<p>Please click the button below to verify your email address:</p>
						<a href="${verificationLink}" class="button">Verify Email</a>
						<p style="margin-top: 20px;">This link will expire in 24 hours.</p>
						<p>If you didn't create an account, you can safely ignore this email.</p>
						<p>Best regards,</p>
						<p>The AlikoHub Academy Team</p>
					</div>
					<div class="footer">
						<p>&copy; ${new Date().getFullYear()} AlikoHub. All rights reserved.</p>
					</div>
				</div>
			</body>
			</html>
		`;

		return this.sendEmail(to, subject, htmlContent);
	}

	async sendContactEmail(dto: { name: string; email: string; phone: string; message: string }): Promise<boolean> {
		const subject = `New Contact Form Submission - Aliko ConTech`;
		const adminEmail = process.env.CONTECH_ADMIN_EMAIL || 'admin@alikohub.com';
		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Contact Form Submission</title>
			</head>
			<body>
				<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
					<h2 style="color: #667eea;">New ConTech Inquiry</h2>
					<p><strong>Name:</strong> ${dto.name}</p>
					<p><strong>Email:</strong> ${dto.email}</p>
					<p><strong>Phone:</strong> ${dto.phone}</p>
					<p><strong>Message:</strong></p>
					<div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea;">
						${dto.message.replace(/\n/g, '<br>')}
					</div>
					<p style="margin-top: 20px; font-size: 12px; color: #666;">This message was sent from the Aliko ConTech public contact form.</p>
				</div>
			</body>
			</html>
		`;

		return this.sendEmail(adminEmail, subject, htmlContent);
	}

	private async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
		return this.mailService.sendMail({
			to,
			subject,
			html: htmlContent,
			fromName: 'AlikoHub Academy',
		});
	}
}
