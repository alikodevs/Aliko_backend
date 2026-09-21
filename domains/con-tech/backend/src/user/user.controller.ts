import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  UseFilters,
} from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import {
  UserService,
  AuthenticatedUser,
  ConTechUserProfile,
} from './user.service';
import { ConTechProfileGuard } from '../auth';
import { ContechRole } from '@prisma/client';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  GetUserProfileSchema,
  UpdateUserProfileSchema,
  SelectUserRoleSchema,
  UserCreatedEventSchema,
} from './user.validation';

@Controller()
@UseGuards(ConTechProfileGuard)
@UseFilters(RpcExceptionFilter)
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @MessagePattern({ cmd: 'get_contech_profile' })
  @UsePipes(new JoiValidationPipe(GetUserProfileSchema))
  async getProfile(
    @Payload() payload: { user: AuthenticatedUser },
  ): Promise<ConTechUserProfile> {
    this.logger.log(`Fetching profile for user: ${payload.user.firebaseId}`);
    try {
      return await this.userService.getOrCreateProfile(payload.user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch profile for user ${payload.user.firebaseId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'create_contech_profile' })
  @UsePipes(new JoiValidationPipe(GetUserProfileSchema))
  async createProfile(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(`Creating profile for user: ${payload.user.firebaseId}`);
    try {
      return await this.userService.getOrCreateProfile(payload.user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create profile for user ${payload.user.firebaseId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_contech_profile' })
  @UsePipes(new JoiValidationPipe(UpdateUserProfileSchema))
  async updateProfile(
    @Payload()
    payload: {
      user: AuthenticatedUser;
      updateData: Partial<ConTechUserProfile>;
    },
  ) {
    this.logger.log(`Updating profile for user: ${payload.user.firebaseId}`);
    try {
      return await this.userService.updateProfile(
        payload.user,
        payload.updateData,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to update profile for user ${payload.user.firebaseId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'select_contech_role' })
  @UsePipes(new JoiValidationPipe(SelectUserRoleSchema))
  async selectRole(@Payload() payload: { userId: string; role: ContechRole }) {
    this.logger.log(
      `Selecting role ${payload.role} for user: ${payload.userId}`,
    );
    try {
      return await this.userService.selectRole(payload.userId, payload.role);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to select role for user ${payload.userId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  @EventPattern('user_created')
  @UsePipes(new JoiValidationPipe(UserCreatedEventSchema))
  async handleUserCreated(
    @Payload()
    payload: {
      userId: string;
      email: string;
      role: string;
      globalRole?: string;
    },
  ) {
    this.logger.log(
      `Handling user_created event for user: ${payload.userId} (${payload.email})`,
    );
    try {
      const authenticatedUser: AuthenticatedUser = {
        firebaseId: payload.userId,
        email: payload.email,
        firstname: '',
        lastname: '',
        role: payload.role,
        globalRole: payload.globalRole,
        status: 'ACTIVE',
      };
      await this.userService.getOrCreateProfile(authenticatedUser);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to handle user_created event for user ${payload.userId}: ${errorMessage}`,
      );
    }
  }

  @MessagePattern({ cmd: 'get_contech_user' })
  async getUserById(@Payload() payload: { userId: string }) {
    this.logger.log(`Fetching details for user: ${payload.userId}`);
    return this.userService.getUserByIdDetailed(payload.userId);
  }

  @MessagePattern({ cmd: 'update_contech_user' })
  async updateUser(@Payload() payload: { userId: string; data: any }) {
    this.logger.log(`Updating user: ${payload.userId}`);
    return this.userService.updateUserAdmin(payload.userId, payload.data);
  }
}
