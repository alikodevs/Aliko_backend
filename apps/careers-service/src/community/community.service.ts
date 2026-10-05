import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async join(data: { email: string; fullName?: string; interests?: string[] }) {
    const existing = await this.prisma.communityMember.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered in the community');
    }

    return this.prisma.communityMember.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.communityMember.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
