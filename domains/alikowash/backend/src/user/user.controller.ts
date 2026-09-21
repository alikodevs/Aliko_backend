import { Controller, Logger, UseGuards, HttpStatus } from "@nestjs/common";
import { MessagePattern, Payload, EventPattern, RpcException } from "@nestjs/microservices";
import { UserService, AuthenticatedUser } from "./user.service";
import { AlikowashRole } from "@prisma/client";

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @MessagePattern({ cmd: "get_alikowash_profile" })
  async getProfile(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching Alikowash profile for user: ${payload.user.firebaseId}`,
    );
    return await this.userService.getProfileAndSync(payload.user);
  }

  @MessagePattern({ cmd: "update_alikowash_user_role" })
  async updateRole(
    @Payload()
    payload: {
      userId: string;
      role: AlikowashRole;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(`Updating Alikowash role for user: ${payload.userId}`);

    // Only global ADMIN can update roles
    if (payload.user.globalRole !== "ADMIN") {
      this.logger.warn(
        `Unauthorized role update attempt by user: ${payload.user.firebaseId}`,
      );
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can update roles",
        error: "Forbidden",
      });
    }

    return await this.userService.updateRole(payload.userId, payload.role);
  }

  @MessagePattern({ cmd: "get_all_alikowash_profiles" })
  async getAllProfiles(@Payload() payload: { user: AuthenticatedUser }) {
    if (payload.user.globalRole !== "ADMIN") {
      this.logger.warn(
        `Unauthorized profiles fetch attempt by user: ${payload.user.firebaseId}`,
      );
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can view all profiles",
        error: "Forbidden",
      });
    }
    return await this.userService.findAllProfiles();
  }

  @EventPattern("user_created")
  async handleUserCreated(
    @Payload()
    payload: {
      userId: string;
      email: string;
      firstname?: string;
      lastname?: string;
      role?: string;
      globalRole?: string;
    },
  ) {
    this.logger.log(
      `Handling user_created event in Alikowash for user: ${payload.userId}`,
    );
    try {
      await this.userService.getProfileAndSync({
        firebaseId: payload.userId,
        email: payload.email,
        firstname: payload.firstname,
        lastname: payload.lastname,
        globalRole: payload.globalRole || payload.role,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to handle user_created in Alikowash: ${error.message}`,
      );
    }
  }

  @EventPattern("user_updated")
  async handleUserUpdated(
    @Payload()
    payload: {
      userId: string;
      email: string;
      firstname?: string;
      lastname?: string;
      role?: string;
      globalRole?: string;
    },
  ) {
    this.logger.log(
      `Handling user_updated event in Alikowash for user: ${payload.userId}`,
    );
    try {
      await this.userService.getProfileAndSync({
        firebaseId: payload.userId,
        email: payload.email,
        firstname: payload.firstname,
        lastname: payload.lastname,
        globalRole: payload.globalRole || payload.role,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to handle user_updated in Alikowash: ${error.message}`,
      );
    }
  }

  @EventPattern("user_deleted")
  async handleUserDeleted(@Payload() payload: { userId: string }) {
    this.logger.log(
      `Handling user_deleted event in Alikowash for user: ${payload.userId}`,
    );
    try {
      await this.userService.removeProfile(payload.userId);
    } catch (error: any) {
      this.logger.error(
        `Failed to handle user_deleted in Alikowash: ${error.message}`,
      );
    }
  }
}
