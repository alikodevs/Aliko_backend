import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/client';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ProfileCreateInput) {
    return this.prisma.profile.create({ data });
  }

  async findAll() {
    return this.prisma.profile.findMany();
  }

  async findOne(id: string) {
    return this.prisma.profile.findUnique({ where: { id } });
  }

  async findByUserId(userId: string) {
    if (!userId) return null;
    return this.prisma.profile.findUnique({ where: { userId } });
  }

  async update(id: string, data: Prisma.ProfileUpdateInput) {
    return this.prisma.profile.update({ where: { id }, data });
  }

  async updateByUserId(userId: string, data: Prisma.ProfileUpdateInput) {
    if (!userId) return null;
    return this.prisma.profile.update({ where: { userId }, data });
  }

  async remove(id: string) {
    return this.prisma.profile.delete({ where: { id } });
  }

  // UserRole CRUD
  async createRole(data: Prisma.UserRoleCreateInput) {
    return this.prisma.userRole.create({ data });
  }

  async findRoles(userId: string) {
    return this.prisma.userRole.findMany({ where: { userId } });
  }

  async removeRole(id: string) {
    return this.prisma.userRole.delete({ where: { id } });
  }
}
