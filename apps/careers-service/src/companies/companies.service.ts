import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany({
      include: {
        _count: {
          select: { jobs: { where: { status: 'OPEN' } } },
        },
      },
    });
  }

  async findOne(idOrSlug: string) {
    const company = await this.prisma.company.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        jobs: {
          where: { status: 'OPEN' },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID or Slug ${idOrSlug} not found`);
    }

    return company;
  }

  async create(data: any) {
    return this.prisma.company.create({
      data: {
        ...data,
        id: data.id || data.slug,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.company.delete({
      where: { id },
    });
  }
}
