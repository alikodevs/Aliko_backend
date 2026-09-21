import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { MembershipApplication, ApplicationStatus } from '../generated/client';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    try {
      return await this.prisma.membershipApplication.create({
        data,
      });
    } catch (error) {
      this.logger.error(`Failed to submit membership application: ${error.message}`);
      throw new RpcException('Failed to submit membership application');
    }
  }

  async findAll() {
    return this.prisma.membershipApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: ApplicationStatus) {
    try {
      return await this.prisma.membershipApplication.update({
        where: { id },
        data: { status },
      });
    } catch (error) {
      this.logger.error(`Failed to update application status ${id}: ${error.message}`);
      throw new RpcException('Failed to update application status');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.membershipApplication.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete application ${id}: ${error.message}`);
      throw new RpcException('Failed to delete application');
    }
  }
}
