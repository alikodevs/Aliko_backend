import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ConshifterProfile, ConshifterRole } from "../generated/client";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "../database/prisma.service";

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

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject("AUTH_SERVICE") private authClient: ClientProxy,
    private prisma: PrismaService,
  ) {}

  async getUserById(userId: string) {
    try {
      const payload = { firebaseId: userId };
      const user = await firstValueFrom(
        this.authClient.send({ cmd: "get_user_profile" }, payload),
      );
      return user;
    } catch (error) {
      this.logger.error(`Failed to fetch user ${userId}`, error);
      return null;
    }
  }

  async getProfileAndSync(
    user: AuthenticatedUser,
  ): Promise<ConshifterProfile | null> {
    await this.syncFromAuth(user.firebaseId);

    let profile = await this.prisma.conshifterProfile.findUnique({
      where: { id: user.firebaseId },
    });

    // If no profile exists, create a basic USER profile (or ADMIN if globalRole matches)
    if (!profile) {
      profile = await this.prisma.conshifterProfile.create({
        data: {
          id: user.firebaseId,
          role: user.globalRole === "ADMIN" ? ConshifterRole.ADMIN : ConshifterRole.USER,
        },
      });
    }

    return profile;
  }

  async updateRole(userId: string, role: ConshifterRole) {
    return this.prisma.conshifterProfile.upsert({
      where: { id: userId },
      update: { role },
      create: {
        id: userId,
        role,
      },
    });
  }

  async findAllProfiles() {
    return this.prisma.conshifterProfile.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async removeProfile(userId: string) {
    return this.prisma.conshifterProfile.delete({
      where: { id: userId },
    });
  }

  private async syncFromAuth(userId: string) {
    try {
      // Fetch the user's full profile from Auth Service to get globalRole
      const authUser: any = await this.getUserById(userId);

      // If the user has globalRole = ADMIN in Auth Service, sync as ADMIN in Conshifter
      if (authUser?.globalRole === "ADMIN") {
        await this.prisma.conshifterProfile.upsert({
          where: { id: userId },
          create: {
            id: userId,
            role: ConshifterRole.ADMIN,
          },
          update: {
            role: ConshifterRole.ADMIN,
          },
        });
        this.logger.log(
          `User ${userId} is a Global ADMIN. Synced as Conshifter ADMIN.`,
        );
        return;
      }

      const authRecord: any = await firstValueFrom(
        this.authClient.send({ cmd: "sync_conshifter_user" }, { userId }),
      );

      if (authRecord) {
        const effectiveRole = authRecord.role;

        if (effectiveRole) {
          await this.prisma.conshifterProfile.upsert({
            where: { id: userId },
            create: {
              id: userId,
              role: effectiveRole as ConshifterRole,
            },
            update: {
              role: effectiveRole as ConshifterRole,
            },
          });
          this.logger.log(
            `Synced user ${userId} from auth service. Role: ${effectiveRole}`,
          );
        }
      }
    } catch (_error) {
      this.logger.warn(`Failed to sync user ${userId} from auth service`);
    }
  }
}
