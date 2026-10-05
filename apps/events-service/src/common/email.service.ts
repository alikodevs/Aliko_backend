import { Injectable } from '@nestjs/common';
import { MailService } from '@alikohub/mail';

@Injectable()
export class EmailService {
	constructor(private readonly mailService: MailService) {}

	private isVirtualEvent(event: any): { isVirtual: boolean; meetingLink: string | null } {
		const externalLink = event?.externalLink?.trim();
		const location = event?.location?.trim() || '';
		const locationAddress = event?.locationAddress?.trim() || '';

		const isUrl = (str: string) => /^https?:\/\//i.test(str);
		const virtualRegex = /(zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com|virtual|online|live\s*stream|webinar)/i;

		if (externalLink && isUrl(externalLink)) {
			return { isVirtual: true, meetingLink: externalLink };
		}

		if (isUrl(location)) {
			return { isVirtual: true, meetingLink: location };
		}

		if (virtualRegex.test(location) || virtualRegex.test(locationAddress) || (externalLink && externalLink.length > 0)) {
			return { isVirtual: true, meetingLink: externalLink || (isUrl(location) ? location : null) };
		}

		return { isVirtual: false, meetingLink: null };
	}

	async sendRegistrationEmail(
		to: string,
		attendeeName: string,
		event: any,
		registration: any,
		ticket?: any,
	): Promise<boolean> {
		const { isVirtual, meetingLink } = this.isVirtualEvent(event);
		const eventTitle = event.title || 'AlikoHub Event';
		const eventDateStr = event.eventDate ? new Date(event.eventDate).toLocaleString('en-US', {
			dateStyle: 'full',
			timeStyle: 'short',
			timeZone: event.timezone || undefined,
		}) : 'TBA';

		if (isVirtual) {
			const subject = `Meeting Link & Access: ${eventTitle}`;
			const joinButtonHtml = meetingLink
				? `
					<div style="text-align: center; margin: 30px 0;">
						<a href="${meetingLink}" target="_blank" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
							🎥 Join Virtual Meeting
						</a>
						<p style="margin-top: 12px; font-size: 13px; color: #64748b; word-break: break-all;">
							Direct Link: <a href="${meetingLink}" style="color: #4f46e5;">${meetingLink}</a>
						</p>
					</div>
				`
				: `
					<div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
						<p style="margin: 0; color: #334155; font-weight: 500;">
							<strong>Location:</strong> ${event.location || 'Online Virtual Meeting'}
						</p>
					</div>
				`;

			const htmlContent = `
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8">
					<title>${subject}</title>
					<style>
						body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
						.container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
						.header { background: linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #7c3aed 100%); color: white; padding: 40px 30px; text-align: center; }
						.header h1 { margin: 0 0 10px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
						.badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
						.content { padding: 35px 30px; }
						.card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
						.card-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
						.card-row:last-child { margin-bottom: 0; }
						.card-label { color: #64748b; font-weight: 500; }
						.card-value { color: #0f172a; font-weight: 600; }
						.footer { text-align: center; padding: 20px; background: #f8fafc; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
					</style>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<span class="badge">Virtual Meeting Access</span>
							<h1 style="margin-top: 12px;">${eventTitle}</h1>
						</div>
						<div class="content">
							<p style="font-size: 16px; color: #334155;">Hello <strong>${attendeeName}</strong>,</p>
							<p style="color: #475569;">You are successfully registered for the virtual event <strong>${eventTitle}</strong>. Here is your access link to join the meeting:</p>
							
							${joinButtonHtml}

							<div class="card">
								<div style="font-weight: 700; color: #1e293b; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Event Details</div>
								<div class="card-row"><span class="card-label">Date & Time:</span> <span class="card-value">${eventDateStr}</span></div>
								${event.timezone ? `<div class="card-row"><span class="card-label">Timezone:</span> <span class="card-value">${event.timezone}</span></div>` : ''}
								${ticket?.name ? `<div class="card-row"><span class="card-label">Ticket Type:</span> <span class="card-value">${ticket.name}</span></div>` : ''}
								${registration?.qrCodeValue ? `<div class="card-row"><span class="card-label">Registration Code:</span> <span class="card-value">${registration.qrCodeValue}</span></div>` : ''}
							</div>

							<p style="font-size: 13px; color: #64748b; margin-top: 25px;">
								💡 <em>Tip: We recommend joining 5 minutes prior to the scheduled start time to test your audio and video connection.</em>
							</p>
							<p style="color: #334155; margin-top: 25px;">Best regards,<br><strong>The AlikoHub Events Team</strong></p>
						</div>
						<div class="footer">
							<p>&copy; ${new Date().getFullYear()} AlikoHub Events. All rights reserved.</p>
						</div>
					</div>
				</body>
				</html>
			`;
			return this.sendEmail(to, subject, htmlContent);
		} else {
			// In-Person / Physical Event Confirmation
			const subject = `Registration Confirmed: ${eventTitle}`;
			const venueInfo = event.location || 'Venue details to be announced';
			const venueAddress = event.locationAddress ? `<div style="color: #64748b; font-size: 13px; margin-top: 4px;">${event.locationAddress}</div>` : '';
			const mapLink = event.locationMapUrl
				? `<div style="margin-top: 8px;"><a href="${event.locationMapUrl}" target="_blank" style="color: #4f46e5; font-size: 13px; font-weight: 600; text-decoration: none;">📍 View on Google Maps &rarr;</a></div>`
				: '';

			const htmlContent = `
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8">
					<title>${subject}</title>
					<style>
						body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
						.container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
						.header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 40px 30px; text-align: center; }
						.header h1 { margin: 0 0 10px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
						.badge { display: inline-block; background: rgba(255,255,255,0.25); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
						.content { padding: 35px 30px; }
						.card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
						.card-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
						.card-row:last-child { margin-bottom: 0; }
						.card-label { color: #64748b; font-weight: 500; }
						.card-value { color: #0f172a; font-weight: 600; }
						.qr-box { background: #ecfdf5; border: 2px dashed #10b981; border-radius: 12px; padding: 18px; text-align: center; margin: 25px 0; }
						.footer { text-align: center; padding: 20px; background: #f8fafc; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
					</style>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<span class="badge">Registration Confirmed</span>
							<h1 style="margin-top: 12px;">${eventTitle}</h1>
						</div>
						<div class="content">
							<p style="font-size: 16px; color: #334155;">Hello <strong>${attendeeName}</strong>,</p>
							<p style="color: #475569;">Your registration for <strong>${eventTitle}</strong> is confirmed! We look forward to seeing you at the venue.</p>

							<div class="card">
								<div style="font-weight: 700; color: #1e293b; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Event Information</div>
								<div class="card-row"><span class="card-label">Date & Time:</span> <span class="card-value">${eventDateStr}</span></div>
								<div class="card-row"><span class="card-label">Venue:</span> <span class="card-value">${venueInfo}</span></div>
								${venueAddress}
								${mapLink}
								${ticket?.name ? `<div class="card-row" style="margin-top: 10px;"><span class="card-label">Ticket Tier:</span> <span class="card-value">${ticket.name}</span></div>` : ''}
								${registration?.totalPaid !== undefined ? `<div class="card-row"><span class="card-label">Amount:</span> <span class="card-value">${registration.totalPaid > 0 ? `$${registration.totalPaid}` : 'Free'} (${registration.paymentStatus || 'paid'})</span></div>` : ''}
							</div>

							${registration?.qrCodeValue ? `
								<div class="qr-box">
									<div style="font-size: 12px; font-weight: bold; color: #065f46; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Your Check-in Reference</div>
									<div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #047857; letter-spacing: 2px;">${registration.qrCodeValue}</div>
									<p style="font-size: 12px; color: #065f46; margin: 6px 0 0 0;">Please present this code at check-in.</p>
								</div>
							` : ''}

							<p style="color: #334155; margin-top: 25px;">Best regards,<br><strong>The AlikoHub Events Team</strong></p>
						</div>
						<div class="footer">
							<p>&copy; ${new Date().getFullYear()} AlikoHub Events. All rights reserved.</p>
						</div>
					</div>
				</body>
				</html>
			`;
			return this.sendEmail(to, subject, htmlContent);
		}
	}

	async sendRsvpConfirmationEmail(
		to: string,
		guestName: string,
		eventTitle: string,
		eventDate: string,
		responseStatus: string,
		rsvpId?: string,
		eventSlugOrId?: string,
		frontendUrl?: string,
	): Promise<boolean> {
		const subject = `RSVP Confirmation: ${eventTitle}`;
		const baseUrl = (frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
		const eventTarget = eventSlugOrId || '';
		
		const statusColors: Record<string, { bg: string; text: string; label: string }> = {
			yes: { bg: '#dcfce7', text: '#15803d', label: "YES, I'LL BE THERE" },
			no: { bg: '#fee2e2', text: '#b91c1c', label: "NO, CANNOT MAKE IT" },
			maybe: { bg: '#fef3c7', text: '#b45309', label: 'MAYBE' },
		};

		const currentStatus = statusColors[responseStatus?.toLowerCase()] || {
			bg: '#e0f2fe',
			text: '#0369a1',
			label: (responseStatus || 'RECEIVED').toUpperCase(),
		};

		const actionLinksHtml = (rsvpId && eventTarget)
			? `
				<div style="margin: 30px 0; padding: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; text-align: center;">
					<p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #334155;">
						Need to update or confirm your attendance? Click a quick response below:
					</p>
					<div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
						<a href="${baseUrl}/social/events/${eventTarget}?rsvpId=${rsvpId}&confirm=yes" target="_blank" style="background: #10b981; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block; margin: 4px;">
							✅ Confirm: Yes
						</a>
						<a href="${baseUrl}/social/events/${eventTarget}?rsvpId=${rsvpId}&confirm=no" target="_blank" style="background: #ef4444; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block; margin: 4px;">
							❌ Decline
						</a>
						<a href="${baseUrl}/social/events/${eventTarget}?rsvpId=${rsvpId}&confirm=maybe" target="_blank" style="background: #f59e0b; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block; margin: 4px;">
							❓ Maybe
						</a>
					</div>
					<div style="margin-top: 14px;">
						<a href="${baseUrl}/social/events/${eventTarget}" target="_blank" style="color: #6366f1; font-size: 12px; font-weight: 600; text-decoration: none;">
							View Event Details Page &rarr;
						</a>
					</div>
				</div>
			`
			: '';

		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>${subject}</title>
				<style>
					body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
					.container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
					.header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 35px 30px; text-align: center; }
					.header h1 { margin: 0; font-size: 24px; font-weight: 800; }
					.content { padding: 35px 30px; background: #fdfdfd; }
					.status-badge { display: inline-block; padding: 8px 18px; border-radius: 30px; font-weight: 700; font-size: 14px; margin: 15px 0; background-color: ${currentStatus.bg}; color: ${currentStatus.text}; }
					.footer { text-align: center; padding: 20px; background: #f8fafc; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>RSVP Confirmation</h1>
					</div>
					<div class="content">
						<p style="font-size: 16px; color: #334155;">Hi <strong>${guestName}</strong>,</p>
						<p style="color: #475569;">Thank you for your response regarding <strong>${eventTitle}</strong>.</p>
						
						<div style="text-align: center; margin: 20px 0;">
							<div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Your Current Response:</div>
							<span class="status-badge">${currentStatus.label}</span>
						</div>
						
						${eventDate ? `<p style="color: #475569; text-align: center;"><strong>Date & Time:</strong> ${new Date(eventDate).toLocaleString()}</p>` : ''}
						
						${actionLinksHtml}

						<p style="color: #64748b; font-size: 13px; margin-top: 25px;">
							If you have any questions or additional requirements, please reach out to the event organizer.
						</p>
						<p style="color: #334155; margin-top: 20px;">Best regards,<br><strong>The AlikoHub Events Team</strong></p>
					</div>
					<div class="footer">
						<p>&copy; ${new Date().getFullYear()} AlikoHub Events. All rights reserved.</p>
					</div>
				</div>
			</body>
			</html>
		`;

		return this.sendEmail(to, subject, htmlContent);
	}

	async sendEventMessageEmail(to: string, subject: string, message: string, eventTitle: string): Promise<boolean> {
		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>${subject}</title>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
					.content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
					.footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>Update: ${eventTitle}</h1>
					</div>
					<div class="content">
						<p>Hello,</p>
						<p>You are receiving this message regarding the event <strong>${eventTitle}</strong>:</p>
						<div style="background: white; padding: 15px; border-left: 4px solid #667eea; border-radius: 4px; margin: 20px 0;">
							${message.replace(/\n/g, '<br>')}
						</div>
						<p>Best regards,</p>
						<p>The AlikoHub Events Team</p>
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

	private async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
		return this.mailService.sendMail({
			to,
			subject,
			html: htmlContent,
			fromName: 'AlikoHub Events',
		});
	}
}
