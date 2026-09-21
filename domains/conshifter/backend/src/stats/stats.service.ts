import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { Stat } from '../generated/client';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    const results = await this.prisma.stat.findMany({
      orderBy: { orderIndex: 'asc' },
    });
    this.logger.log(`Found ${results.length} stats`);
    return results;
  }

  async create(data: any) {
    this.logger.log(`Creating stat: ${data.label}`);
    try {
      const result = await this.prisma.stat.create({
        data,
      });
      this.logger.log(`Successfully created stat: ${data.label} (ID: ${result.id})`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create stat ${data.label}: ${error.message}`);
      throw new RpcException('Failed to create stat');
    }
  }

  async update(id: string, data: any) {
    this.logger.log(`Updating stat ID: ${id}`);
    try {
      const result = await this.prisma.stat.update({
        where: { id },
        data,
      });
      this.logger.log(`Successfully updated stat ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update stat ${id}: ${error.message}`);
      throw new RpcException('Failed to update stat');
    }
  }

  async remove(id: string) {
    this.logger.log(`Deleting stat ID: ${id}`);
    try {
      await this.prisma.stat.delete({
        where: { id },
      });
      this.logger.log(`Successfully deleted stat ID: ${id}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete stat ${id}: ${error.message}`);
      throw new RpcException('Failed to delete stat');
    }
  }
}
