import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContechRole } from '@prisma/client';

@Injectable()
export class UserApplicationService {
  private readonly logger = new Logger(UserApplicationService.name);
  constructor(private prisma: PrismaService) {}

  async updateUserRole(userId: string, role: string) {
    if (!Object.values(ContechRole).includes(role as ContechRole)) {
      this.logger.error(
        `Invalid role "${role}" received for user ${userId}. Skipping.`,
      );
      return;
    }

    const newRole = role as ContechRole;
    const updatedProfile = await this.prisma.contechProfile.upsert({
      where: { userId: userId },
      update: {
        role: newRole,
      },
      create: {
        userId: userId,
        role: newRole,
      },
    });

    this.logger.log(
      `Successfully updated role for user ${userId} to ${updatedProfile.role}`,
    );
    return updatedProfile;
  }
}
