import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { Testimonial } from '../generated/client';

@Injectable()
export class TestimonialsService {
  private readonly logger = new Logger(TestimonialsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.testimonial.findMany({
      where: { isFeatured: true },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.testimonial.findMany({
      orderBy: { orderIndex: 'asc' },
    });
  }

  async create(data: any) {
    try {
      return await this.prisma.testimonial.create({
        data,
      });
    } catch (error) {
      this.logger.error(`Failed to create testimonial: ${error.message}`);
      throw new RpcException('Failed to create testimonial');
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.testimonial.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error(`Failed to update testimonial ${id}: ${error.message}`);
      throw new RpcException('Failed to update testimonial');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.testimonial.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete testimonial ${id}: ${error.message}`);
      throw new RpcException('Failed to delete testimonial');
    }
  }
}
