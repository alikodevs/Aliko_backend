import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { EventsProfile, EventsRole } from "../generated/client";
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
  ): Promise<EventsProfile | null> {
    await this.syncFromAuth(user.firebaseId);

    let profile = await this.prisma.eventsProfile.findUnique({
      where: { id: user.firebaseId },
    });

    // If no profile exists, create a basic USER profile (or ADMIN if globalRole matches)
    if (!profile) {
      profile = await this.prisma.eventsProfile.create({
        data: {
          id: user.firebaseId,
          role: user.globalRole === "ADMIN" ? EventsRole.ADMIN : EventsRole.USER,
        },
      });
    }

    return profile;
  }

  async updateRole(userId: string, role: EventsRole) {
    return this.prisma.eventsProfile.upsert({
      where: { id: userId },
      update: { role },
      create: {
        id: userId,
        role,
      },
    });
  }

  async findAllProfiles() {
    return this.prisma.eventsProfile.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async removeProfile(userId: string) {
    return this.prisma.eventsProfile.delete({
      where: { id: userId },
    });
  }

  private async syncFromAuth(userId: string) {
    try {
      // Fetch the user's full profile from Auth Service to get globalRole
      const authUser: any = await this.getUserById(userId);

      // If the user has globalRole = ADMIN in Auth Service, sync as ADMIN in Events
      if (authUser?.globalRole === "ADMIN") {
        await this.prisma.eventsProfile.upsert({
          where: { id: userId },
          create: {
            id: userId,
            role: EventsRole.ADMIN,
          },
          update: {
            role: EventsRole.ADMIN,
          },
        });
        this.logger.log(
          `User ${userId} is a Global ADMIN. Synced as Events ADMIN.`,
        );
        return;
      }

      const authRecord: any = await firstValueFrom(
        this.authClient.send({ cmd: "sync_events_user" }, { userId }),
      );

      if (authRecord) {
        const effectiveRole = authRecord.role;

        if (effectiveRole) {
          await this.prisma.eventsProfile.upsert({
            where: { id: userId },
            create: {
              id: userId,
              role: effectiveRole as EventsRole,
            },
            update: {
              role: effectiveRole as EventsRole,
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
