import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/events';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL_EVENTS ||
            process.env.DATABASE_URL ||
            'postgresql://postgres:postgres@localhost:5432/events_db?schema=public',
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to Events Service database');
    } catch (err: any) {
      this.logger.error(`Events Service database connection failed: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
