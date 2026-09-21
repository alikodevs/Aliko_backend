import {
  Controller,
  UseGuards,
  ForbiddenException,
  Logger,
  UsePipes,
  UseFilters,
} from "@nestjs/common";
import { MessagePattern, Payload, EventPattern } from "@nestjs/microservices";
import { ConshifterRole } from "../generated/client";
import { UserService, AuthenticatedUser } from "./user.service";
import { ConshifterProfileGuard } from "../auth/conshifter-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import {
  GetConshifterProfileSchema,
  UpdateUserRoleSchema,
  UserCreatedEventSchema,
  UserIdSchema,
  EmptyPayloadWithUserSchema,
} from "./user.validation";

@Controller()
@UseFilters(RpcExceptionFilter)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @MessagePattern({ cmd: "get_conshifter_profile" })
  @UseGuards(ConshifterProfileGuard)
  @UsePipes(new JoiValidationPipe(GetConshifterProfileSchema))
  async getProfile(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching Conshifter profile for user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.userService.getProfileAndSync(payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch Conshifter profile for user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "update_user_role" })
  @UseGuards(ConshifterProfileGuard)
  @UsePipes(new JoiValidationPipe(UpdateUserRoleSchema))
  async updateRole(
    @Payload()
    payload: {
      userId: string;
      role: ConshifterRole;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating role to ${payload.role} for user: ${payload.userId} (initiated by: ${payload.user.firebaseId})`,
    );
    try {
      // Only admins can update roles
      const adminProfile = await this.userService.getProfileAndSync(
        payload.user,
      );
      if (!adminProfile || adminProfile.role !== ConshifterRole.ADMIN) {
        throw new ForbiddenException("Unauthorized: Only admins can update roles");
      }

      return await this.userService.updateRole(payload.userId, payload.role);
    } catch (error) {
      this.logger.error(
        `Failed to update role for user ${payload.userId} by admin ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "get_all_profiles" })
  @UseGuards(ConshifterProfileGuard)
  @UsePipes(new JoiValidationPipe(EmptyPayloadWithUserSchema))
  async getAllProfiles(@Payload() payload: { user: AuthenticatedUser }) {
    const adminProfile = await this.userService.getProfileAndSync(payload.user);
    if (!adminProfile || adminProfile.role !== ConshifterRole.ADMIN) {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }
    return this.userService.findAllProfiles();
  }

  @MessagePattern({ cmd: "delete_profile" })
  @UseGuards(ConshifterProfileGuard)
  @UsePipes(new JoiValidationPipe(UserIdSchema))
  async deleteProfile(
    @Payload() payload: { userId: string; user: AuthenticatedUser },
  ) {
    const adminProfile = await this.userService.getProfileAndSync(payload.user);
    if (!adminProfile || adminProfile.role !== ConshifterRole.ADMIN) {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }
    return this.userService.removeProfile(payload.userId);
  }

  @EventPattern("user_created")
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
        firstname: "",
        lastname: "",
        role: payload.role,
        globalRole: payload.globalRole,
        status: "ACTIVE",
      };
      await this.userService.getProfileAndSync(authenticatedUser);
      this.logger.log(
        `Successfully synced Conshifter profile for user: ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle user_created event for user ${payload.userId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
