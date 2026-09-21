import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AlikowashRole } from "@prisma/client";

export interface AuthenticatedUser {
  firebaseId: string;
  email: string;
  firstname?: string;
  lastname?: string;
  role?: string;
  globalRole?: string;
  status?: string;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfileAndSync(user: AuthenticatedUser) {
    this.logger.log(`Syncing profile for user: ${user.firebaseId}`);

    let localUser = await this.prisma.user.findUnique({
      where: { id: user.firebaseId },
    });

    if (!localUser) {
      this.logger.log(
        `Creating new local profile for user: ${user.firebaseId}`,
      );
      localUser = await this.prisma.user.create({
        data: {
          id: user.firebaseId,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          role: this.mapGlobalRole(user.globalRole),
        },
      });
    } else {
      // Update fields if they changed
      const updateData: any = {};
      if (
        user.globalRole === "ADMIN" &&
        localUser.role !== AlikowashRole.ADMIN
      ) {
        updateData.role = AlikowashRole.ADMIN;
      }
      if (user.firstname && user.firstname !== localUser.firstname) {
        updateData.firstname = user.firstname;
      }
      if (user.lastname && user.lastname !== localUser.lastname) {
        updateData.lastname = user.lastname;
      }

      if (Object.keys(updateData).length > 0) {
        this.logger.log(`Updating local profile for user: ${user.firebaseId}`);
        localUser = await this.prisma.user.update({
          where: { id: user.firebaseId },
          data: updateData,
        });
      }
    }

    return localUser;
  }

  async updateRole(userId: string, role: AlikowashRole) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async findAllProfiles() {
    return await this.prisma.user.findMany();
  }

  async removeProfile(userId: string) {
    return await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  private mapGlobalRole(globalRole?: string): AlikowashRole {
    if (globalRole === "ADMIN") return AlikowashRole.ADMIN;
    return AlikowashRole.USER;
  }
}
