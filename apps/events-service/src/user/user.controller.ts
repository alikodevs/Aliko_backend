import {
  Controller,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  UsePipes,
  UseFilters,
  ForbiddenException,
} from "@nestjs/common";
import { MessagePattern, Payload, EventPattern } from "@nestjs/microservices";
import { EventsRole } from "../generated/client";
import { UserService, AuthenticatedUser } from "./user.service";
import { EventsProfileGuard } from "../auth/events-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import {
  GetEventsProfileSchema,
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

  @MessagePattern({ cmd: "get_events_profile" })
  @UseGuards(EventsProfileGuard)
  @UsePipes(new JoiValidationPipe(GetEventsProfileSchema))
  async getProfile(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching Events profile for user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.userService.getProfileAndSync(payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch Events profile for user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "update_user_role" })
  @UseGuards(EventsProfileGuard)
  @UsePipes(new JoiValidationPipe(UpdateUserRoleSchema))
  async updateRole(
    @Payload()
    payload: {
      userId: string;
      role: EventsRole;
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
      if (!adminProfile || adminProfile.role !== EventsRole.ADMIN) {
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
  @UseGuards(EventsProfileGuard)
  @UsePipes(new JoiValidationPipe(EmptyPayloadWithUserSchema))
  async getAllProfiles(@Payload() payload: { user: AuthenticatedUser }) {
    const adminProfile = await this.userService.getProfileAndSync(payload.user);
    if (!adminProfile || adminProfile.role !== EventsRole.ADMIN) {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }
    return this.userService.findAllProfiles();
  }

  @MessagePattern({ cmd: "delete_profile" })
  @UseGuards(EventsProfileGuard)
  @UsePipes(new JoiValidationPipe(UserIdSchema))
  async deleteProfile(
    @Payload() payload: { userId: string; user: AuthenticatedUser },
  ) {
    const adminProfile = await this.userService.getProfileAndSync(payload.user);
    if (!adminProfile || adminProfile.role !== EventsRole.ADMIN) {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }
    return this.userService.removeProfile(payload.userId);
  }

  @MessagePattern({ cmd: "get_user_role" })
  @UseGuards(EventsProfileGuard)
  @UsePipes(new JoiValidationPipe(GetEventsProfileSchema))
  async getUserRole(@Payload() payload: { user: AuthenticatedUser }) {
    const profile = await this.userService.getProfileAndSync(payload.user);
    return {
      userId: payload.user.firebaseId,
      role: profile?.role ?? EventsRole.USER,
    };
  }

  @MessagePattern({ cmd: "assign_role" })
  @UseGuards(EventsProfileGuard)
  async assignRole(
    @Payload()
    payload: {
      dto: { requestedRole: string };
      user: AuthenticatedUser;
    },
  ) {
    const requested = String(payload.dto?.requestedRole || "").toUpperCase();
    // Legacy ORGANIZER maps to CONTENT_MANAGER
    const roleMap: Record<string, EventsRole> = {
      USER: EventsRole.USER,
      ORGANIZER: EventsRole.CONTENT_MANAGER,
      CONTENT_MANAGER: EventsRole.CONTENT_MANAGER,
      ADMIN: EventsRole.ADMIN,
    };

    const targetRole = roleMap[requested];
    if (!targetRole) {
      throw new ForbiddenException(
        "Invalid role. Allowed: USER, ORGANIZER, CONTENT_MANAGER",
      );
    }

    const current = await this.userService.getProfileAndSync(payload.user);

    // Self-service must not demote or replace an existing ADMIN
    if (current?.role === EventsRole.ADMIN) {
      return current;
    }

    // Self-service cannot escalate to ADMIN
    if (targetRole === EventsRole.ADMIN) {
      if (payload.user.globalRole !== "ADMIN") {
        throw new ForbiddenException(
          "Cannot self-assign ADMIN. Ask an existing admin.",
        );
      }
    }

    return this.userService.updateRole(payload.user.firebaseId, targetRole);
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
        `Successfully synced Events profile for user: ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle user_created event for user ${payload.userId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
