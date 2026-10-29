import {
  Controller,
  Logger,
  UsePipes,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import {
  UserService,
  AuthenticatedUser,
  AcademyUserProfile,
} from './user.service';
import { AcademyRole } from '@prisma/client/academy';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { AcademyProfileGuard } from '../auth';
import {
  UserProfileSchema,
  SelectRoleSchema,
  UserCreatedEventSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from './user.validation';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get(['profile', 'academy/profile', 'user/profile'])
  @MessagePattern({ cmd: 'get_academy_profile' })
  @UseGuards(AcademyProfileGuard)
  async getProfile(
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser },
  ): Promise<AcademyUserProfile> {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Received getProfile request for user: ${user?.firebaseId}`,
    );
    try {
      return await this.userService.getOrCreateProfile(user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get academy profile for user ${user?.firebaseId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  @Post(['profile', 'academy/profile', 'user/profile'])
  @MessagePattern({ cmd: 'create_academy_profile' })
  @UsePipes(new JoiValidationPipe(UserProfileSchema))
  async createProfile(
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Received createProfile request for user: ${user?.firebaseId}`,
    );
    try {
      return await this.userService.getOrCreateProfile(user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create academy profile for user ${user?.firebaseId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  // Role selection - supports direct HTTP and microservice TCP
  @Post(['select-role', 'academy/select-role', 'user/select-role'])
  @MessagePattern({ cmd: 'select_academy_role' })
  @UseGuards(AcademyProfileGuard)
  @UsePipes(new JoiValidationPipe(SelectRoleSchema))
  async selectRole(
    @Body() body?: any,
    @Req() req?: any,
    @Payload()
    payload?: {
      user: AuthenticatedUser;
      userId: string;
      role: AcademyRole;
    },
  ) {
    const data = payload || body || {};
    const user = payload?.user || req?.user;
    const userId = data.userId || user?.firebaseId || user?.userId || user?.id;
    const role = data.role;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    if (!role) {
      throw new BadRequestException('Role is required');
    }

    this.logger.log(
      `Received selectRole request for user: ${userId} to role: ${role}`,
    );

    try {
      const result = await this.userService.selectRole(userId, role);
      this.logger.log(`Role selection successful for user: ${userId}`);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Role selection failed for user: ${userId} to role ${role}: ${errorMessage}`,
      );
      throw error;
    }
  }

  @EventPattern('user_created')
  @UsePipes(new JoiValidationPipe(UserCreatedEventSchema))
  async handleUserCreated(
    @Payload() payload: { userId: string; email: string; role: string },
  ) {
    this.logger.log(`Received user_created event for user: ${payload.userId}`);
    try {
      const authenticatedUser: AuthenticatedUser = {
        firebaseId: payload.userId,
        email: payload.email,
        firstname: '',
        lastname: '',
        role: payload.role,
        status: 'ACTIVE',
        globalRole: payload.role === 'ADMIN' ? 'ADMIN' : 'USER',
      };
      await this.userService.getOrCreateProfile(authenticatedUser);
      this.logger.log(`Academy profile ensured for user: ${payload.userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to handle user_created event for user: ${payload.userId}: ${errorMessage}`,
      );
    }
  }

  @Post(['forgot-password', 'academy/forgot-password'])
  @MessagePattern({ cmd: 'forgot_password' })
  @UsePipes(new JoiValidationPipe(ForgotPasswordSchema))
  async forgotPassword(
    @Body() body?: { email: string; frontendUrl?: string; app?: string },
    @Payload()
    payload?: { email: string; frontendUrl?: string; app?: string },
  ) {
    const data = payload?.email ? payload : body;
    if (!data?.email) {
      throw new BadRequestException('Email is required');
    }
    this.logger.log(`Received forgotPassword request for: ${data.email}`);
    try {
      return await this.userService.forgotPassword(data);
    } catch (error) {
      this.logger.error(
        `Forgot password failed for ${data.email}: ${error.message}`,
      );
      throw error;
    }
  }

  @Post(['reset-password', 'academy/reset-password'])
  @MessagePattern({ cmd: 'reset_password' })
  @UsePipes(new JoiValidationPipe(ResetPasswordSchema))
  async resetPassword(
    @Body() body?: any,
    @Payload() payload?: any,
  ) {
    const data = payload?.newPassword || payload?.token ? payload : body;
    if (!data?.token || !data?.newPassword) {
      throw new BadRequestException('Token and newPassword are required');
    }
    this.logger.log(
      `Received resetPassword request for: ${data.email || '(token)'}`,
    );
    try {
      return await this.userService.resetPassword(data);
    } catch (error) {
      this.logger.error(
        `Reset password failed for ${data.email || '(token)'}: ${error.message}`,
      );
      throw error;
    }
  }
}
