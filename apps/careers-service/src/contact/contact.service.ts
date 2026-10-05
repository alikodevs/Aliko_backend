import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(data: { name: string; email: string; subject?: string; message: string }) {
    return this.prisma.contactSubmission.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { read: true },
    });
  }
}
