import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/academy';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    let url =
      process.env.DATABASE_URL_ACADEMY ||
      process.env.ACADEMY_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://alikohub:SecurePassword123!@127.0.0.1:5432/alikohub_db?schema=academy';

    if (url.includes('schema=')) {
      url = url.replace(/schema=[^&]+/, 'schema=academy');
    } else {
      url += (url.includes('?') ? '&' : '?') + 'schema=academy';
    }

    super({
      datasources: {
        db: {
          url,
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
