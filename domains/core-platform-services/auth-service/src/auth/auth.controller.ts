import { Controller, UsePipes, Logger, Post, Get, Body, Query, Patch, Param, Delete, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { SignUpDto, SignInDto } from './dto';
import { SelectRoleDto, TeacherApplicationDto } from './dto/academy-roles.dto';
import * as Joi from 'joi';
import { JoiValidationPipe } from '../validation.pipe';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import {
	SignUpSchema,
	SignInSchema,
	GoogleLoginSchema,
	SelectAcademyRoleSchema,
	SwitchAcademyRoleSchema,
	UserStatusUpdateSchema,
	UserIdentitySchema,
	CreateContechUserSchema,
	CreateEventsUserSchema,
	ForgotPasswordSchema,
	ResetPasswordSchema
} from './auth.validation';

@Controller()
@UseFilters(RpcExceptionFilter)
export class AuthController {
	private readonly logger = new Logger(AuthController.name);
	constructor(private readonly authService: AuthService) {}

	@Get('health')
	healthCheckGet() {
		return { status: 'up', service: 'auth-service', timestamp: new Date().toISOString() };
	}

	@Post('health')
	@MessagePattern({ cmd: 'health_check' })
	healthCheckPost() {
		return { status: 'up', service: 'auth-service', timestamp: new Date().toISOString() };
	}

	@Post('register')
	@MessagePattern({ cmd: 'register' })
	@UsePipes(new JoiValidationPipe(SignUpSchema))
	async register(@Body() dto: SignUpDto, @Payload() payload: SignUpDto) {
		const data = dto || payload;
		this.logger.log(`Registering new user: ${data.email}`);
		try {
			return await this.authService.register(data);
		} catch (error) {
			this.logger.error(`Failed to register user ${data.email}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('create-recruiter')
	@MessagePattern({ cmd: 'create_recruiter' })
	@UsePipes(new JoiValidationPipe(SignUpSchema))
	async createRecruiter(@Body() dto: any, @Payload() payload: any) {
		const data = dto || payload;
		this.logger.log(`Creating recruiter account for: ${data.email}`);
		try {
			return await this.authService.createRecruiter(data);
		} catch (error) {
			this.logger.error(`Failed to create recruiter ${data.email}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('create-contech-user')
	@MessagePattern({ cmd: 'create_contech_user' })
	@UsePipes(new JoiValidationPipe(CreateContechUserSchema))
	async createContechUser(@Body() dto: any, @Payload() payload: any) {
		const data = dto || payload;
		this.logger.log(`Creating ConTech user: ${data.email} with role ${data.role}`);
		try {
			return await this.authService.createContechUser(data);
		} catch (error) {
			this.logger.error(`Failed to create ConTech user ${data.email}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('create-events-user')
	@MessagePattern({ cmd: 'create_events_user' })
	@UsePipes(new JoiValidationPipe(CreateEventsUserSchema))
	async createEventsUser(@Body() dto: any, @Payload() payload: any) {
		const data = dto || payload;
		this.logger.log(`Creating Events user: ${data.email} with role ${data.role}`);
		try {
			return await this.authService.createEventsUser(data);
		} catch (error) {
			this.logger.error(`Failed to create Events user ${data.email}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('login')
	@MessagePattern({ cmd: 'login' })
	@UsePipes(new JoiValidationPipe(SignInSchema))
	async login(@Body() dto: SignInDto, @Payload() payload: SignInDto) {
		const data = dto || payload;
		this.logger.log(`Processing login for: ${data.email}`);
		try {
			return await this.authService.login(data);
		} catch (error) {
			this.logger.error(`Login failed for ${data.email}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('login-google')
	@MessagePattern({ cmd: 'login_google' })
	@UsePipes(new JoiValidationPipe(GoogleLoginSchema))
	async loginWithGoogle(@Body() body: { idToken: string }, @Payload() payload: { idToken: string }) {
		this.logger.log(`Processing Google login`);
		try {
			const token = body?.idToken || payload?.idToken;
			return await this.authService.loginWithGoogle(token);
		} catch (error) {
			this.logger.error(`Google login failed: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('verify')
	@MessagePattern({ cmd: 'verify' })
	async verify(@Body() dto: { type: 'cookie' | 'token'; value: string }, @Payload() payload: { type: 'cookie' | 'token'; value: string }) {
		this.logger.log(`Verifying authentication`);
		try {
			return await this.authService.verifyAuth(dto || payload);
		} catch (error) {
			this.logger.error(`Auth verification failed: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('create-session')
	@MessagePattern({ cmd: 'create_session' })
	async createSession(@Body() dto: { idToken: string; expiresIn?: number }, @Payload() payload: { idToken: string; expiresIn?: number }) {
		const data = dto || payload;
		this.logger.log(`Creating session cookie`);
		try {
			return await this.authService.createSessionCookie(data.idToken, data.expiresIn);
		} catch (error) {
			this.logger.error(`Session creation failed: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('academy/select-role')
	@MessagePattern({ cmd: 'select_academy_role' })
	@UsePipes(new JoiValidationPipe(SelectAcademyRoleSchema))
	async handleSelectRole(@Body() dto: SelectRoleDto, @Payload() payload: SelectRoleDto) {
		const data = dto || payload;
		this.logger.log(`Selecting Academy role ${data.role} for user: ${data.userId}`);
		try {
			return await this.authService.selectAcademyRole(data.userId, data.role);
		} catch (error) {
			this.logger.error(`Failed to select Academy role ${data.role} for user ${data.userId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('academy/apply-teacher')
	@MessagePattern({ cmd: 'apply_teacher_role' })
	async handleTeacherApplication(@Body() dto: TeacherApplicationDto, @Payload() payload: TeacherApplicationDto) {
		const data = dto || payload;
		this.logger.log(`Processing teacher application for user: ${data.userId}`);
		try {
			return await this.authService.applyForTeacherRole(data);
		} catch (error) {
			this.logger.error(`Teacher application failed for user ${data.userId || 'unknown'}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('academy/teacher-applications')
	@MessagePattern({ cmd: 'get_teacher_applications' })
	async handleGetTeacherApplications(@Query() query: { requestingUserRole?: string }, @Payload() payload: { requestingUserRole?: string }) {
		const role = query?.requestingUserRole || payload?.requestingUserRole;
		this.logger.log(`Fetching teacher applications (requested by role: ${role})`);
		try {
			return await this.authService.getTeacherApplications(role);
		} catch (error) {
			this.logger.error(`Failed to fetch teacher applications: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('academy/instructor/:id')
	@MessagePattern({ cmd: 'get_instructor_by_id' })
	async handleGetInstructorById(@Body() dto: { id: string }, @Payload() payload: { id: string }) {
		const id = dto?.id || payload?.id;
		this.logger.log(`Fetching instructor details for ID: ${id}`);
		try {
			return await this.authService.getInstructorById(id);
		} catch (error) {
			this.logger.error(`Failed to fetch instructor ID ${id}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('academy/approve-teacher')
	@MessagePattern({ cmd: 'approve_teacher_application' })
	async handleApproveTeacher(@Body() dto: any, @Payload() payload: any) {
		const data = dto || payload;
		this.logger.log(`Approving teacher application: ${data.applicationId} by reviewer: ${data.reviewerId}`);
		try {
			return await this.authService.approveTeacherApplication(data.applicationId, data.requestingUserRole, data.reviewerId, data.reviewNotes);
		} catch (error) {
			this.logger.error(`Failed to approve teacher application ${data.applicationId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('academy/reject-teacher')
	@MessagePattern({ cmd: 'reject_teacher_application' })
	async handleRejectTeacher(@Body() dto: any, @Payload() payload: any) {
		const data = dto || payload;
		this.logger.log(`Rejecting teacher application: ${data.applicationId} by reviewer: ${data.reviewerId}`);
		try {
			return await this.authService.rejectTeacherApplication(data.applicationId, data.requestingUserRole, data.reviewerId, data.reviewNotes);
		} catch (error) {
			this.logger.error(`Failed to reject teacher application ${data.applicationId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('academy/switch-role')
	@MessagePattern({ cmd: 'switch_role' })
	@UsePipes(new JoiValidationPipe(SwitchAcademyRoleSchema))
	async handleSwitchRole(@Body() dto: { userId: string; newRole: string }, @Payload() payload: { userId: string; newRole: string }) {
		const data = dto || payload;
		this.logger.log(`Switching Academy role to ${data.newRole} for user: ${data.userId}`);
		try {
			return await this.authService.switchRole(data.userId, data.newRole);
		} catch (error) {
			this.logger.error(`Failed to switch Academy role for user ${data.userId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('academy/status')
	@MessagePattern({ cmd: 'get_user_academy_status' })
	async handleGetUserStatus(@Body() dto: { userId: string }, @Payload() payload: { userId: string }) {
		const data = dto || payload;
		this.logger.log(`Fetching Academy status for user: ${data.userId}`);
		try {
			return await this.authService.getUserAcademyStatus(data.userId);
		} catch (error) {
			this.logger.error(`Failed to fetch Academy status for user ${data.userId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('sync/contech')
	@MessagePattern({ cmd: 'sync_contech_user' })
	async handleSyncContechUser(@Body() dto: { userId: string }, @Payload() payload: { userId: string }) {
		const data = dto || payload;
		this.logger.log(`Syncing ConTech user: ${data.userId}`);
		try {
			return await this.authService.syncContechUser(data.userId);
		} catch (error) {
			this.logger.error(`ConTech sync failed for user ${data.userId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('sync/careers')
	@MessagePattern({ cmd: 'sync_careers_user' })
	async handleSyncCareersUser(@Body() dto: { userId: string }, @Payload() payload: { userId: string }) {
		const data = dto || payload;
		this.logger.log(`Syncing Careers user: ${data.userId}`);
		try {
			return await this.authService.syncCareersUser(data.userId);
		} catch (error) {
			this.logger.error(`Careers sync failed for user ${data.userId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('update-contech-role')
	@MessagePattern({ cmd: 'update_contech_role' })
	async handleUpdateContechRole(@Body() dto: { userId: string; role: string }, @Payload() payload: { userId: string; role: string }) {
		const data = dto || payload;
		this.logger.log(`Updating ConTech role for user ${data.userId} to ${data.role}`);
		try {
			return await this.authService.updateContechRole(data.userId, data.role);
		} catch (error) {
			this.logger.error(`ConTech role update failed for user ${data.userId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('sync/events')
	@MessagePattern({ cmd: 'sync_events_user' })
	async handleSyncEventsUser(@Body() dto: { userId: string }, @Payload() payload: { userId: string }) {
		const data = dto || payload;
		this.logger.log(`Syncing Events user: ${data.userId}`);
		try {
			return await this.authService.syncEventsUser(data.userId);
		} catch (error) {
			this.logger.error(`Events sync failed for user ${data.userId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('sync/academy')
	@MessagePattern({ cmd: 'sync_academy_user' })
	async handleSyncAcademyUser(@Body() dto: { userId: string }, @Payload() payload: { userId: string }) {
		const data = dto || payload;
		this.logger.log(`Syncing Academy user: ${data.userId}`);
		try {
			return await this.authService.syncAcademyUser(data.userId);
		} catch (error) {
			this.logger.error(`Academy sync failed for user ${data.userId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('sync/conshifter')
	@MessagePattern({ cmd: 'sync_conshifter_user' })
	async handleSyncConshifterUser(@Body() dto: { userId: string }, @Payload() payload: { userId: string }) {
		const data = dto || payload;
		this.logger.log(`Syncing Conshifter user: ${data.userId}`);
		try {
			return await this.authService.syncConshifterUser(data.userId);
		} catch (error) {
			this.logger.error(`Conshifter sync failed for user ${data.userId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('forgot-password')
	@MessagePattern({ cmd: 'forgot_password' })
	@UsePipes(new JoiValidationPipe(ForgotPasswordSchema))
	async forgotPassword(
		@Body() body: { email: string; frontendUrl?: string; app?: string },
		@Payload() payload: { email: string; frontendUrl?: string; app?: string },
	) {
		const data = body?.email ? body : payload;
		const email = data?.email;
		this.logger.log(`Password reset requested for: ${email}`);
		try {
			return await this.authService.forgotPassword(email, {
				frontendUrl: data?.frontendUrl,
				app: data?.app,
			});
		} catch (error) {
			this.logger.error(`Forgot password failed for ${email}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('reset-password')
	@MessagePattern({ cmd: 'reset_password' })
	@UsePipes(new JoiValidationPipe(ResetPasswordSchema))
	async resetPassword(@Body() body: any, @Payload() payload: any) {
		const data = body?.newPassword || body?.token ? body : payload;
		this.logger.log(`Processing password reset`);
		try {
			return await this.authService.resetPassword(data);
		} catch (error) {
			this.logger.error(`Reset password failed: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Post('contact/email')
	@MessagePattern({ cmd: 'send_contact_email' })
	async handleSendContactEmail(@Body() dto: any, @Payload() payload: any) {
		const data = dto || payload;
		this.logger.log(`Sending contact email to: ${data.email || 'unknown'}`);
		try {
			return await this.authService.sendContactEmail(data);
		} catch (error) {
			this.logger.error(`Failed to send contact email to ${data.email || 'unknown'}: ${error.message}`, error.stack);
			throw error;
		}
	}

  @MessagePattern({ cmd: 'update_careers_role' })
  async handleUpdateCareersRole(@Body() dto: { userId: string; role: string }, @Payload() payload: { userId: string; role: string }) {
    const data = dto || payload;
    this.logger.log(`Updating Careers role for ${data.userId} to ${data.role}`);
    try {
      return await this.authService.updateCareersRole(data.userId, data.role);
    } catch (error) {
      this.logger.error(`Failed to update Careers role for user ${data.userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

	@Patch('user/status')
	@MessagePattern({ cmd: 'update_status' })
	@UsePipes(new JoiValidationPipe(UserStatusUpdateSchema))
	async handleUpdateStatus(@Body() dto: { firebaseId: string; status: string }, @Payload() payload: { firebaseId: string; status: string }) {
		const data = dto || payload;
		this.logger.log(`Updating user status for ${data.firebaseId} to ${data.status}`);
		try {
			return await this.authService.updateStatus(data.firebaseId, data.status);
		} catch (error) {
			this.logger.error(`Failed to update status for user ${data.firebaseId}: ${error.message}`, error.stack);
			throw error;
		}
	}

	@Delete('user')
	@MessagePattern({ cmd: 'delete_user' })
	@UsePipes(new JoiValidationPipe(UserIdentitySchema))
	async handleDeleteUser(@Body() dto: { firebaseId: string }, @Payload() payload: { firebaseId: string }) {
		const firebaseId = dto?.firebaseId || payload?.firebaseId;
		this.logger.log(`Deleting user: ${firebaseId}`);
		try {
			return await this.authService.deleteUser(firebaseId);
		} catch (error) {
			this.logger.error(`Failed to delete user ${firebaseId}: ${error.message}`, error.stack);
			throw error;
		}
	}
}
