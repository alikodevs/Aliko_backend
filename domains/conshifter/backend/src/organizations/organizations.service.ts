import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { Organization, OrganizationStatus } from '../generated/client';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    const results = await this.prisma.organization.findMany({
      where: { status: OrganizationStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
    });
    this.logger.log(`Found ${results.length} approved organizations`);
    return results;
  }

  async findOne(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (!org) {
      this.logger.warn(`Organization with slug ${slug} not found`);
      throw new RpcException('Organization not found');
    }
    return org;
  }

  async createPublic(data: any) {
    try {
      const result = await this.prisma.organization.create({
        data: {
          ...data,
          status: OrganizationStatus.PENDING,
        },
      });
      this.logger.log(`Successfully submitted organization: ${data.name}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to submit organization ${data.name}: ${error.message}`);
      throw new RpcException('Failed to submit organization');
    }
  }

  async findAllAdmin() {
    return this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: OrganizationStatus) {
    try {
      const result = await this.prisma.organization.update({
        where: { id },
        data: { status },
      });
      this.logger.log(`Successfully updated organization ID: ${id} status to: ${status}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update organization status ${id}: ${error.message}`);
      throw new RpcException('Failed to update organization status');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.organization.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete organization ${id}: ${error.message}`);
      throw new RpcException('Failed to delete organization');
    }
  }
}
