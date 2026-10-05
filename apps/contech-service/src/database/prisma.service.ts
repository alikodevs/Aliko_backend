import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/contech';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL_CONTECH ||
            process.env.DATABASE_URL ||
            'postgresql://postgres:postgres@localhost:5432/contech_db?schema=public',
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to ConTech Service database');
    } catch (err: any) {
      this.logger.error(`ConTech Service database connection failed: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
