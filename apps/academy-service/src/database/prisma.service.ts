import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/academy';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL_ACADEMY ||
            process.env.DATABASE_URL ||
            'postgresql://postgres:postgres@localhost:5432/academy_db?schema=public',
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to Academy Service database');
    } catch (err: any) {
      this.logger.error(`Academy Service database connection failed: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
