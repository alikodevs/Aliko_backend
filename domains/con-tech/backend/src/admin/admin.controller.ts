import { Controller, Logger, UsePipes, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProjectsService } from '../projects/projects.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { ContechRole } from '@prisma/client';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { AdminDashboardSchema, ListProfilesSchema, CreateUserSchema } from './admin.validation';

@Controller()
@UseFilters(RpcExceptionFilter)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly userService: UserService,
  ) {}

  @MessagePattern({ cmd: 'get_admin_dashboard' })
  @UsePipes(new JoiValidationPipe(AdminDashboardSchema))
  async getDashboard(@Payload() payload: Record<string, any>) {
    const { user } = payload as { user: AuthenticatedUser };
    this.logger.log(
      `Fetching admin dashboard data (requested by: ${user.firebaseId})`,
    );

    try {
      const profile = await this.userService.getOrCreateProfile(user);
      if (profile.role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required');
      }

      const stats = await this.projectsService.getProjectStats(user);

      const [totalClients, totalContractors] = await Promise.all([
        this.userService.countByRole(ContechRole.CLIENT),
        this.userService.countByRole(ContechRole.CONTRACTOR),
      ]);

      return {
        projectStats: stats,
        users: {
          clients: totalClients,
          contractors: totalContractors,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch admin dashboard for user ${user.firebaseId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'list_contech_users' })
  @UsePipes(new JoiValidationPipe(ListProfilesSchema))
  async listUsers(@Payload() payload: Record<string, any>) {
    const { user, role, page, pageSize } = payload as {
      user: AuthenticatedUser;
      role: ContechRole;
      page?: number;
      pageSize?: number;
    };
    this.logger.log(
      `Listing users with role: ${role || 'all'} (requested by admin: ${user.firebaseId})`,
    );

    try {
      const adminProfile = await this.userService.getOrCreateProfile(user);
      if (adminProfile.role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required');
      }

      return await this.userService.findProfilesByRole(role, page, pageSize);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to list users for admin ${user.firebaseId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'register_contech_user' })
  @UsePipes(new JoiValidationPipe(CreateUserSchema))
  async registerUser(@Payload() payload: Record<string, any>) {
    const { user, ...userData } = payload as {
      user: AuthenticatedUser;
      email: string;
      firstname: string;
      lastname?: string;
      password?: string;
      role: ContechRole;
    };

    this.logger.log(
      `Admin ${user.firebaseId} is registering a new ${userData.role}: ${userData.email}`,
    );

    try {
      const adminProfile = await this.userService.getOrCreateProfile(user);
      if (adminProfile.role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required');
      }

      return await this.userService.createContechUser(userData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to register user ${userData.email} by admin ${user.firebaseId}: ${errorMessage}`,
      );
      throw error;
    }
  }
}
