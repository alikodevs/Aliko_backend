import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { Program } from '../generated/client';

@Injectable()
export class ProgramsService {
  private readonly logger = new Logger(ProgramsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    const results = await this.prisma.program.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });
    this.logger.log(`Found ${results.length} active programs`);
    return results;
  }

  async findAllAdmin() {
    const results = await this.prisma.program.findMany({
      orderBy: { orderIndex: 'asc' },
    });
    this.logger.log(`Found ${results.length} programs (Admin view)`);
    return results;
  }

  async findOneAdmin(id: string) {
    this.logger.log(`Finding program detail for ID: ${id} (Admin view)`);
    const result = await this.prisma.program.findUnique({
      where: { id },
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!result) {
      throw new RpcException(`Program with ID ${id} not found`);
    }

    return result;
  }

  async create(data: any) {
    this.logger.log(`Creating program: ${data.name}`);
    try {
      const result = await this.prisma.program.create({
        data,
      });
      this.logger.log(`Successfully created program: ${data.name} (ID: ${result.id})`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create program ${data.name}: ${error.message}`);
      throw new RpcException('Failed to create program');
    }
  }

  async update(id: string, data: any) {
    this.logger.log(`Updating program ID: ${id}`);
    try {
      const result = await this.prisma.program.update({
        where: { id },
        data,
      });
      this.logger.log(`Successfully updated program ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update program ${id}: ${error.message}`);
      throw new RpcException('Failed to update program');
    }
  }

  async remove(id: string) {
    this.logger.log(`Deleting program ID: ${id}`);
    try {
      await this.prisma.program.delete({
        where: { id },
      });
      this.logger.log(`Successfully deleted program ID: ${id}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete program ${id}: ${error.message}`);
      throw new RpcException('Failed to delete program');
    }
  }
}
