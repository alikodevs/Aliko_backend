import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(publishedOnly = true) {
    return this.prisma.content.findMany({
      where: publishedOnly ? { published: true } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(slug: string) {
    const content = await this.prisma.content.findUnique({
      where: { slug },
    });

    if (!content) {
      throw new NotFoundException(`Content with slug ${slug} not found`);
    }

    return content;
  }

  async create(data: any) {
    return this.prisma.content.create({
      data: {
        ...data,
        published: data.published ?? false,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.content.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }
}
