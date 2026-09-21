import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { NewsletterSubscriber } from '../generated/client';

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name);

  constructor(private prisma: PrismaService) {}

  async subscribe(data: any) {
    try {
      return await this.prisma.newsletterSubscriber.upsert({
        where: { email: data.email },
        update: { isActive: true, role: data.role },
        create: { ...data, isActive: true },
      });
    } catch (error) {
      this.logger.error(`Failed to subscribe: ${error.message}`);
      throw new RpcException('Failed to subscribe');
    }
  }

  async findAll() {
    return this.prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
    });
  }
}
