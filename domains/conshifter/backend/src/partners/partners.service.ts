import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { Partner } from '../generated/client';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.partner.findMany({
      orderBy: { orderIndex: 'asc' },
    });
  }

  async create(data: any) {
    try {
      return await this.prisma.partner.create({
        data,
      });
    } catch (error) {
      this.logger.error(`Failed to create partner: ${error.message}`);
      throw new RpcException('Failed to create partner');
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.partner.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error(`Failed to update partner ${id}: ${error.message}`);
      throw new RpcException('Failed to update partner');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.partner.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete partner ${id}: ${error.message}`);
      throw new RpcException('Failed to delete partner');
    }
  }
}
