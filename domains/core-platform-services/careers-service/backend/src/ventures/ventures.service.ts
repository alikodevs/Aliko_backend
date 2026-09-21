import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VenturesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.venture.findMany({
      include: {
        _count: {
          select: { jobs: { where: { status: 'OPEN' } } },
        },
      },
    });
  }

  async findOne(idOrSlug: string) {
    const venture = await this.prisma.venture.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        jobs: {
          where: { status: 'OPEN' },
        },
      },
    });

    if (!venture) {
      throw new NotFoundException(`Venture with ID or Slug ${idOrSlug} not found`);
    }

    return venture;
  }

  async create(data: any) {
    return this.prisma.venture.create({
      data: {
        ...data,
        id: data.id || data.slug, // Ensure we have an ID
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.venture.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.venture.delete({
      where: { id },
    });
  }
}
