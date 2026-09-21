import { Controller, Post, Get, Inject, Body, HttpCode, HttpStatus, Param, HttpException, Logger, Res, UseGuards, Request, ForbiddenException, BadRequestException, UsePipes, Patch, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';
import { AuthGuard } from '../common/guard/firebase_auth.guard';
import { RoleGuard } from '../common/roles/roles.guard';
import { AdminAccessGuard } from '../common/guard/admin-access.guard';
import { Roles } from '../common/roles/roles.decorator';
import { SelectRoleDto, TeacherApplicationDto, SwitchRoleDto, InstructorApplicationDto } from './dto/academy-roles.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { catchError, timeout } from 'rxjs/operators';
import { Throttle } from '@nestjs/throttler';
import { throwError, TimeoutError, firstValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
import * as Joi from 'joi';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../file-upload-service/file-upload.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
    private readonly fileUploadService: FileUploadService,
  ) {}

  private handleError(error: any, operation: string) {
    this.logger.error(`${operation} failed:`, error);
    
    if (error instanceof TimeoutError) {
      throw new HttpException('Auth service timeout', HttpStatus.GATEWAY_TIMEOUT);
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new HttpException('Auth service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }

    let status = HttpStatus.BAD_REQUEST;
    if (typeof error?.statusCode === 'number') {
      status = error.statusCode;
    } else if (typeof error?.status === 'number') {
      status = error.status;
    }

    const message = error?.message || 'Error from microservice';
    const errorType = error?.error || 'Microservice Error';

    throw new HttpException({
      statusCode: status,
      message,
      error: errorType,
      details: error?.details || error?.stack || null
    }, status);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  @UsePipes(new JoiValidationPipe(Joi.object({
    email: Joi.string().email().required().trim(),
    password: Joi.string().required()
  })))
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login attempt for: ${loginDto.email}`);
    
    this.logger.log(`Sending login command to auth service for: ${loginDto.email}`);
    const result = await firstValueFrom(
      this.authClient.send({ cmd: 'login' }, loginDto).pipe(
        timeout(30000),
        catchError(error => {
          this.logger.error(`Login error caught: ${error.message}`);
          this.handleError(error, 'Login');
          return throwError(() => error);
        }),
      )
    );
    this.logger.log(`Login response received for: ${loginDto.email}`);
    return result;
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @UsePipes(new JoiValidationPipe(Joi.object({
    email: Joi.string().email().required().trim(),
    firstname: Joi.string().required().pattern(/^[A-Za-z\s]+$/).trim().messages({'string.pattern.base': 'firstname must contain only alphabetic characters'}),
    lastname: Joi.string().optional().allow(null, '').pattern(/^[A-Za-z\s]*$/).trim().messages({'string.pattern.base': 'lastname must contain only alphabetic characters'}),
    password: Joi.string().min(8).regex(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/).required().messages({'string.pattern.base': 'Password too weak'}),
    _hp: Joi.string().optional().allow(null, '')
  })))
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`Registration attempt for: ${registerDto.email}`);
    
    // Honeypot check: If the hidden field is filled, it's highly likely a bot.
    if (registerDto._hp) {
      this.logger.warn(`Honeypot field filled for: ${registerDto.email}. Bot detected!`);
      // We return 201 Created but don't actually process it to fool the bot.
      return { 
        statusCode: HttpStatus.CREATED,
        message: 'Registration successful' 
      };
    }

    // Remove honeypot field before sending to auth service
    const { _hp, ...authPayload } = registerDto;
    
    return firstValueFrom(
      this.authClient.send({ cmd: 'register' }, authPayload).pipe(
        timeout(30000),
        catchError(error => {
          this.handleError(error, 'Registration');
          return throwError(() => error);
        }),
      )
    );
  }


  @Post('academy/select-role')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Select academy role' })
  @UsePipes(new JoiValidationPipe(Joi.object({
    role: Joi.string().required().lowercase().valid('student', 'teacher', 'instructor').messages({
      'any.only': 'Role must be one of: student, teacher, instructor'
    })
  })))
  async selectAcademyRole(@Request() req: any, @Body() selectRoleDto: SelectRoleDto) {
    // Inject userId from authenticated user
    const payload = { 
      ...selectRoleDto, 
      userId: req.user.firebaseId 
    };
    
    return firstValueFrom(
      this.authClient.send({ cmd: 'select_academy_role' }, payload).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Select Academy Role');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('academy/apply-teacher')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('resume', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply for teacher role' })
  async applyTeacher(
    @Request() req: any, 
    @Body() applicationDto: TeacherApplicationDto,
    @UploadedFile() resume?: Express.Multer.File,
  ) {
    if (resume) {
      const uploadResult = await this.fileUploadService.uploadFile(resume, 'document');
      applicationDto.resumeUrl = uploadResult.url;
    }

    const payload = {
      ...applicationDto,
      userId: req.user.firebaseId
    };

    return firstValueFrom(
      this.authClient.send({ cmd: 'apply_teacher_role' }, payload).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Apply Teacher');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('academy/apply-instructor')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('resume', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply for instructor role (FormData friendly)' })
  async applyInstructor(
    @Request() req: any,
    @Body() dto: InstructorApplicationDto,
    @UploadedFile() resume?: Express.Multer.File,
  ) {
    let resumeUrl = null;
    if (resume) {
      const uploadResult = await this.fileUploadService.uploadFile(resume, 'document');
      resumeUrl = uploadResult.url;
    }

    // Parse categories from string to array
    const teachingCategories = dto.teachingCategories.split(',').map(c => c.trim());
    
    // Parse interview responses if provided as JSON string
    let interviewResponses = [];
    if (dto.interviewResponses) {
      try {
        interviewResponses = JSON.parse(dto.interviewResponses);
      } catch (e) {
        throw new BadRequestException('Invalid format for interviewResponses. Must be a JSON string.');
      }
    }

    const payload = {
      userId: req.user.firebaseId,
      personalDetails: {
        firstname: dto.firstname,
        lastname: dto.lastname,
        email: dto.email,
        phone: dto.phone,
      },
      teachingCategories,
      resumeUrl,
      interviewResponses,
    };

    return firstValueFrom(
      this.authClient.send({ cmd: 'apply_teacher_role' }, payload).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Apply Instructor');
          return throwError(() => error);
        }),
      )
    );
  }

  @Get('academy/instructor/:id')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @ApiOperation({ summary: 'Get instructor/applicant details by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Instructor details' })
  async getInstructorById(@Param('id') id: string) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'get_instructor_by_id' }, { id }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Get Instructor By ID');
          return throwError(() => error);
        }),
      )
    );
  }

  @Get('academy/teacher-applications')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @ApiOperation({ summary: 'Get all teacher applications (Admin only)' })
  async getTeacherApplications(@Request() req: any) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'get_teacher_applications' }, { requestingUserRole: req.user.globalRole }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Get Teacher Applications');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('academy/approve-teacher/:applicationId')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve teacher application (Admin only)' })
  @UsePipes(new JoiValidationPipe(Joi.object({
    reviewNotes: Joi.string().required().min(5).messages({
      'string.empty': 'Review notes are required for approval',
      'string.min': 'Review notes must be at least 5 characters long'
    })
  })))
  async approveTeacher(@Request() req: any, @Param('applicationId') applicationId: string, @Body() body: { reviewNotes?: string }) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'approve_teacher_application' }, { 
        applicationId, 
        requestingUserRole: req.user.globalRole,
        reviewerId: req.user.firebaseId,
        reviewNotes: body.reviewNotes
      }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Approve Teacher');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('academy/reject-teacher/:applicationId')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject teacher application (Admin only)' })
  @UsePipes(new JoiValidationPipe(Joi.object({
    reviewNotes: Joi.string().required().min(5).messages({
      'string.empty': 'Review notes are required for rejection',
      'string.min': 'Review notes must be at least 5 characters long'
    })
  })))
  async rejectTeacher(@Request() req: any, @Param('applicationId') applicationId: string, @Body() body: { reviewNotes?: string }) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'reject_teacher_application' }, { 
        applicationId, 
        requestingUserRole: req.user.globalRole,
        reviewerId: req.user.firebaseId,
        reviewNotes: body.reviewNotes
      }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Reject Teacher');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('academy/switch-role')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch user role' })
  @UsePipes(new JoiValidationPipe(Joi.object({
    newRole: Joi.string().required().lowercase().valid('student', 'teacher', 'instructor').messages({
      'any.only': 'newRole must be one of: student, teacher, instructor'
    }),
    userId: Joi.string().optional()
  })))
  async switchRole(@Request() req: any, @Body() switchRoleDto: SwitchRoleDto) {
    const payload = {
      ...switchRoleDto,
      userId: req.user.firebaseId
    };
    return firstValueFrom(
      this.authClient.send({ cmd: 'switch_role' }, payload).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Switch Role');
          return throwError(() => error);
        }),
      )
    );
  }

  @Get('academy/user-status/:userId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get user academy status' })
  async getUserAcademyStatus(@Request() req: any, @Param('userId') userId: string) {
    // TEST-07 Fix: Verify user ownership - users can only view their own status unless they are admin
    // Note: Use req.user.id as the URL parameter is a numeric ID
    const requestingUserId = req.user.id.toString();
    const isAdmin = req.user.globalRole === 'ADMIN';
    
    if (requestingUserId !== userId && !isAdmin) {
      throw new ForbiddenException('You are not authorized to view another user\'s academy status');
    }
    
    return firstValueFrom(
      this.authClient.send({ cmd: 'get_user_academy_status' }, { userId }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Get User Academy Status');
          return throwError(() => error);
        }),
      )
    );
  }


  @Post('login/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google' })
  @UsePipes(new JoiValidationPipe(Joi.object({
    idToken: Joi.string().required()
  })))
  async loginWithGoogle(@Body() body: { idToken: string }) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'login_google' }, body).pipe(
        timeout(30000),
        catchError(error => {
          this.handleError(error, 'Google Login');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create session cookie from ID token' })
  async createSession(@Body() body: { idToken: string }, @Res({ passthrough: true }) response: Response) {
    const result = await firstValueFrom(
      this.authClient.send({ cmd: 'create_session' }, { idToken: body.idToken }).pipe(
        timeout(30000),
        catchError(error => {
          this.handleError(error, 'Create Session');
          return throwError(() => error);
        }),
      )
    );

    const { sessionCookie, expiresIn } = result;

    response.cookie('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true, // Always secure for SameSite=None
      sameSite: 'none', // Allow cross-site/cross-subdomain
      path: '/',
      domain: '.alikohub.com', // Share across all subdomains
    });

    return { status: 'success', message: 'Session cookie set' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear session cookie' })
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('session');
    return { status: 'success', message: 'Logged out' };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify authentication token or cookie' })
  async verify(@Body() body: { type: 'cookie' | 'token'; value: string }) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'verify' }, body).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Verify Auth');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @UsePipes(new JoiValidationPipe(Joi.object({
    email: Joi.string().email().required().trim(),
    frontendUrl: Joi.string().uri().optional(),
    app: Joi.string().valid('academy', 'events').optional(),
  })))
  async forgotPassword(@Body() body: { email: string; frontendUrl?: string; app?: string }) {
    return firstValueFrom(
      this.authClient.send(
        { cmd: 'forgot_password' },
        { ...body, app: body.app || 'events' },
      ).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Forgot Password');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update password using reset link token' })
  @UsePipes(new JoiValidationPipe(Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).regex(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/).required(),
    email: Joi.string().email().optional().trim(),
  })))
  async resetPassword(@Body() body: any) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'reset_password' }, body).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Reset Password');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('contech/user')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a ConTech user (Admin only)' })
  @ApiResponse({ status: 201, description: 'ConTech user created successfully' })
  async createContechUser(@Body() dto: any) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'create_contech_user' }, dto).pipe(
        timeout(30000),
        catchError(error => {
          this.handleError(error, 'Create ConTech User');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('recruiter')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Careers recruiter (Admin only)' })
  @ApiResponse({ status: 201, description: 'Recruiter created successfully' })
  async createRecruiter(@Body() dto: any) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'create_recruiter' }, dto).pipe(
        timeout(30000),
        catchError(error => {
          this.handleError(error, 'Create Recruiter');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('sync/careers')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync Careers profile for current user' })
  async syncCareersProfile(@Request() req: any) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'sync_careers_user' }, { userId: req.user.firebaseId }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Sync Careers Profile');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('events/user')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an Events user/content manager (Admin only)' })
  @ApiResponse({ status: 201, description: 'Events user created successfully' })
  async createEventsUser(@Body() dto: any) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'create_events_user' }, dto).pipe(
        timeout(30000),
        catchError(error => {
          this.handleError(error, 'Create Events User');
          return throwError(() => error);
        }),
      )
    );
  }

  @Patch('user/:id/status')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user status (Admin only)' })
  async updateStatus(@Param('id') firebaseId: string, @Body('status') status: string) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'update_status' }, { firebaseId, status }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Update Status');
          return throwError(() => error);
        }),
      )
    );
  }

  @Delete('user/:id')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user account (Admin only)' })
  async deleteUser(@Param('id') firebaseId: string) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'delete_user' }, { firebaseId }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Delete User');
          return throwError(() => error);
        }),
      )
    );
  }
}
