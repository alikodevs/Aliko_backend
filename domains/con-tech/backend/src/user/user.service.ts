import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { ContechRole } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

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

export type ConTechUserProfile = {
  id: number;
  userId: string;
  role: ContechRole;
  hasSelectedRole: boolean;
  bio?: string | null;
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
    private prisma: PrismaService,
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
  ) {}

  async getOrCreateProfile(
    user: AuthenticatedUser,
  ): Promise<ConTechUserProfile> {
    await this.syncFromAuth(user.firebaseId);

    // Fetch fresh user data from Auth Service to ensure we have the latest details
    const authUser = await this.getUserById(user.firebaseId);
    // Fallback to the provided user object if fetch fails
    const effectiveUser = authUser || user;

    let profile = await this.prisma.contechProfile.findUnique({
      where: { userId: user.firebaseId },
    });

    if (!profile) {
      profile = await this.prisma.contechProfile.create({
        data: {
          userId: user.firebaseId,
          role: ContechRole.CLIENT,
          hasSelectedRole: false,
        },
      });
    }

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

    return this.prisma.contechProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        role: ContechRole.CLIENT,
        hasSelectedRole: false,
      },
    });
  }

  private async syncFromAuth(userId: string) {
    try {
      // Check if user has already selected a local ConTech role
      const existingProfile = await this.prisma.contechProfile.findUnique({
        where: { userId },
      });

      const authUser = await this.getUserById(userId);

      // If the user has globalRole = ADMIN in Auth Service, sync as ADMIN in ConTech
      if (authUser?.globalRole === 'ADMIN') {
        await this.prisma.contechProfile.upsert({
          where: { userId },
          create: {
            userId,
            role: ContechRole.ADMIN,
            hasSelectedRole: true, // Mark as selected to prevent overwrite
          },
          update: {
            role: ContechRole.ADMIN,
            hasSelectedRole: true,
          },
        });
        this.logger.log(
          `User ${userId} is a Global ADMIN. Synced as ConTech ADMIN.`,
        );
        return;
      }

      // If user has selected a role locally, don't overwrite it with Auth service data
      if (existingProfile?.hasSelectedRole) {
        this.logger.log(
          `User ${userId} has a locally selected role. Skipping sync from auth.`,
        );
        return;
      }

      const authRecord: { activeRole?: string; role?: string } | null =
        await firstValueFrom(
          this.authClient.send({ cmd: 'sync_contech_user' }, { userId }),
        );

      if (authRecord) {
        // Priority: 1. activeRole (if switched), 2. role (base role)
        const effectiveRole = authRecord.activeRole || authRecord.role;

        if (effectiveRole) {
          await this.prisma.contechProfile.upsert({
            where: { userId },
            create: {
              userId,
              role: effectiveRole as ContechRole,
              hasSelectedRole: !!authRecord.activeRole,
            },
            update: {
              role: effectiveRole as ContechRole,
              // If activeRole is present, update hasSelectedRole
              hasSelectedRole: authRecord.activeRole ? true : undefined,
            },
          });
          this.logger.log(
            `Synced user ${userId} from auth service. Role: ${effectiveRole}`,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync user ${userId} from auth service`,
        errorMessage,
      );
    }
  }

  async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    try {
      return await firstValueFrom(
        this.authClient.send(
          { cmd: 'get_user_profile' },
          { firebaseId: userId },
        ),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch user ${userId}`, errorMessage);
      return null;
    }
  }

  async getUsersByIds(userIds: string[]): Promise<AuthenticatedUser[]> {
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'get_users_by_ids' }, { userIds }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch multiple users', errorMessage);
      return [];
    }
  }

  async updateProfile(
    user: AuthenticatedUser,
    updateData: Partial<ConTechUserProfile>,
  ) {
    const profile = await this.prisma.contechProfile.update({
      where: { userId: user.firebaseId },
      data: updateData,
    });

    return {
      ...profile,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      globalRole: user.globalRole,
      status: user.status,
    };
  }

  async selectRole(userId: string, role: ContechRole) {
    try {
      const existingProfile = await this.prisma.contechProfile.findUnique({
        where: { userId },
      });

      let updatedProfile: import('@prisma/client').ContechProfile;
      if (existingProfile) {
        updatedProfile = await this.prisma.contechProfile.update({
          where: { userId },
          data: { role, hasSelectedRole: true },
        });
      } else {
        updatedProfile = await this.prisma.contechProfile.create({
          data: { userId, role, hasSelectedRole: true },
        });
      }

      // Notify Auth service of the role change so JWT tokens are updated
      try {
        await firstValueFrom(
          this.authClient.send(
            { cmd: 'update_contech_role' },
            { userId, role },
          ),
        );
        this.logger.log(
          `Notified Auth service of role change for user ${userId}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to notify Auth service of role change for user ${userId}`,
          errorMessage,
        );
        // Don't fail the operation if Auth service notification fails
      }

      return updatedProfile;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Error in selectRole', errorMessage);
      throw error;
    }
  }

  async countByRole(role: ContechRole) {
    return this.prisma.contechProfile.count({
      where: { role },
    });
  }

  async findProfilesByRole(role: ContechRole, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [profiles, total] = await Promise.all([
      this.prisma.contechProfile.findMany({
        where: { role },
        skip,
        take: pageSize,
      }),
      this.prisma.contechProfile.count({ where: { role } }),
    ]);

    const userIds = profiles.map((p) => p.userId);
    const authUsers = await this.getUsersByIds(userIds);

    const enrichedProfiles = profiles.map((profile) => {
      const authUser = authUsers.find((au) => au.firebaseId === profile.userId);
      return {
        ...profile,
        email: authUser?.email,
        firstname: authUser?.firstname,
        lastname: authUser?.lastname,
        status: authUser?.status,
      };
    });

    return {
      items: enrichedProfiles,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createContechUser(data: {
    email: string;
    firstname: string;
    lastname?: string;
    password?: string;
    role: ContechRole;
  }) {
    this.logger.log(`Requesting user creation from Auth Service: ${data.email}`);
    try {
      const authUser: AuthenticatedUser = await firstValueFrom(
        this.authClient.send({ cmd: 'create_contech_user' }, data),
      );

      // Create the local profile as well
      await this.prisma.contechProfile.upsert({
        where: { userId: authUser.firebaseId },
        create: {
          userId: authUser.firebaseId,
          role: data.role,
          hasSelectedRole: true,
        },
        update: {
          role: data.role,
          hasSelectedRole: true,
        },
      });

      return authUser;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create ConTech user via Auth Service: ${errorMessage}`,
      );
      throw error;
    }
  }

  async getUserByIdDetailed(userId: string): Promise<ConTechUserProfile | null> {
    const profile = await this.prisma.contechProfile.findUnique({
      where: { userId },
    });
    if (!profile) return null;

    const authUser = await this.getUserById(userId);
    if (!authUser) return null;

    return {
      ...profile,
      email: authUser.email,
      firstname: authUser.firstname,
      lastname: authUser.lastname,
      globalRole: authUser.globalRole,
      status: authUser.status,
    };
  }

  async updateUserAdmin(userId: string, data: any) {
    const { role, bio, companyName, company, phone, ...authData } = data;

    // 1. Update local profile
    const profile = await this.prisma.contechProfile.update({
      where: { userId },
      data: {
        role: role as ContechRole,
        bio,
        companyName,
        company,
        phone,
      },
    });

    // 2. Update Auth service if needed (role or other metadata)
    try {
      if (authData && Object.keys(authData).length > 0) {
        await firstValueFrom(
          this.authClient.send({ cmd: 'update_user' }, { firebaseId: userId, ...authData })
        );
      } else if (role) {
        // Just role update notification
        await firstValueFrom(
          this.authClient.send({ cmd: 'update_contech_role' }, { userId, role })
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to update Auth service for user ${userId}: ${error.message}`);
    }

    return this.getUserByIdDetailed(userId);
  }
}
