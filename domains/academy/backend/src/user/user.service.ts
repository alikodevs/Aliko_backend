import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AcademyRole } from '../generated/client';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

export type AuthenticatedUser = {
  firebaseId: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  globalRole?: string;
  status: string;
  activeRole?: string;
};

export type AcademyUserProfile = {
  id: number;
  userId: string;
  role: AcademyRole;
  hasSelectedRole: boolean;
  bio?: string | null;
  expertise?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  firstname: string;
  lastname: string;
  globalRole?: string;
  status: string;
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
    private prisma: PrismaService,
  ) {}

  // ... (getUserById / getUsersByIds methods remain same) ...
  async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    try {
      this.logger.log(`Fetching user details for: ${userId} from Auth Service`);
      const payload = {
        firebaseId: userId,
      };

      const user = (await firstValueFrom(
        this.authClient.send({ cmd: 'get_user_profile' }, payload),
      )) as AuthenticatedUser;
      this.logger.log(
        `Received user details for ${userId}: ${JSON.stringify(user)}`,
      );
      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch user ${userId}`, errorMessage);
      return null;
    }
  }

  async getUsersByIds(userIds: string[]): Promise<AuthenticatedUser[]> {
    try {
      // The payload is simple: an object with a 'userIds' property
      const payload = { userIds };

      const users = (await firstValueFrom(
        this.authClient.send({ cmd: 'get_users_by_ids' }, payload),
      )) as AuthenticatedUser[];
      return users;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch users`, errorMessage);
      return []; // Return an empty array on failure
    }
  }

  async getOrCreateProfile(
    user: AuthenticatedUser,
  ): Promise<AcademyUserProfile> {
    await this.syncFromAuth(user.firebaseId);

    // Fetch fresh user data from Auth Service to ensure we have the latest details
    const authUser = await this.getUserById(user.firebaseId);
    // Fallback to the provided user object if fetch fails
    const effectiveUser = authUser || user;

    let profile = await this.prisma.academyProfile.findUnique({
      where: { userId: user.firebaseId },
    });

    if (!profile) {
      const roleToAssign =
        user.globalRole === 'ADMIN' ? AcademyRole.ADMIN : AcademyRole.USER;
      profile = await this.prisma.academyProfile.create({
        data: {
          userId: user.firebaseId,
          role: roleToAssign,
          hasSelectedRole: false, // New users should see the role selection modal
        },
      });
    }

    // Return the profile with enriched user data
    return {
      ...profile,
      email: effectiveUser.email,
      firstname: effectiveUser.firstname,
      lastname: effectiveUser.lastname,
      globalRole: effectiveUser.globalRole,
      status: effectiveUser.status,
    };
  }

  async ensureProfileExists(userId: string) {
    const authUser = await this.getUserById(userId);
    if (!authUser) return null;

    await this.syncFromAuth(userId);

    return this.prisma.academyProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        role: AcademyRole.USER,
        hasSelectedRole: false,
      },
    });
  }

  private async syncFromAuth(userId: string) {
    try {
      this.logger.log(
        `[UserService] Syncing user ${userId} from Auth service (TCP 3011)...`,
      );
      const authRecord = (await firstValueFrom(
        this.authClient
          .send({ cmd: 'sync_academy_user' }, { userId })
          .pipe(timeout(5000)),
      )) as AuthenticatedUser;

      if (authRecord) {
        this.logger.log(
          `[UserService] Auth record received for ${userId}: ${JSON.stringify(authRecord)}`,
        );
        // Determine effective role: prefer activeRole (user's current working context)
        // over base role, since activeRole represents what the user selected in the UI
        // (e.g. a user with base role INSTRUCTOR who switched to STUDENT mode).
        let effectiveRole = authRecord.activeRole || authRecord.role;

        // If the user is a global admin, they are an admin in Academy too regardless of active role
        if (authRecord.globalRole === 'ADMIN') {
          effectiveRole = 'ADMIN';
        }

        if (effectiveRole) {
          await this.prisma.academyProfile.upsert({
            where: { userId },
            create: {
              userId,
              role: effectiveRole as AcademyRole,
              hasSelectedRole: !!authRecord.activeRole,
            },
            update: {
              role: effectiveRole as AcademyRole,
              // If activeRole is present, we know a selection has been made
              hasSelectedRole: authRecord.activeRole ? true : undefined,
            },
          });
          this.logger.log(
            `[UserService] Successfully synced user ${userId}. Academy role set to: ${effectiveRole}`,
          );
        } else {
          this.logger.warn(
            `[UserService] No role found in auth record for ${userId}`,
          );
        }
      } else {
        this.logger.warn(`[UserService] No auth record returned for ${userId}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[UserService] Failed to sync user ${userId} from auth service:`,
        errorMessage,
      );
      // Don't rethrow yet, we might want to proceed with a default profile
    }
  }

  // Add this new method for role selection
  async selectRole(userId: string, role: AcademyRole) {
    try {
      const existingProfile = await this.prisma.academyProfile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        // Update the profile with the selected role and mark hasSelectedRole as true
        return await this.prisma.academyProfile.update({
          where: { userId },
          data: {
            role: role,
            hasSelectedRole: true,
          },
        });
      } else {
        // Create a new profile with the selected role
        return await this.prisma.academyProfile.create({
          data: {
            userId: userId,
            role: role,
            hasSelectedRole: true,
          },
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Error in selectRole:', errorMessage);
      throw error;
    }
  }

  async forgotPassword(payload: {
    email: string;
    frontendUrl?: string;
    app?: string;
  }) {
    try {
      this.logger.log(`Forwarding forgotPassword request for: ${payload.email}`);
      return await firstValueFrom(
        this.authClient.send(
          { cmd: 'forgot_password' },
          {
            email: payload.email,
            frontendUrl: payload.frontendUrl,
            app: payload.app || 'academy',
          },
        ),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to forward forgotPassword for ${payload.email}`,
        errorMessage,
      );
      throw error;
    }
  }

  async resetPassword(payload: any) {
    try {
      this.logger.log(
        `Forwarding resetPassword request for: ${payload.email || '(token)'}`,
      );
      return await firstValueFrom(
        this.authClient.send({ cmd: 'reset_password' }, payload),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to forward resetPassword for ${payload.email || '(token)'}`,
        errorMessage,
      );
      throw error;
    }
  }
}
