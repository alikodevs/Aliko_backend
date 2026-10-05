import { Controller, Get, Optional, SetMetadata } from '@nestjs/common';
import { PrismaService } from '@aliko/database';

@Controller('health')
export class HealthController {
  constructor(@Optional() private prisma?: PrismaService) {}

  @SetMetadata('isPublic', true)
  @Get()
  async check() {
    let dbStatus = 'n/a';
    if (this.prisma) {
      try {
        await (this.prisma as any).$queryRaw`SELECT 1`;
        dbStatus = 'up';
      } catch (err: any) {
        dbStatus = `down: ${err?.message}`;
      }
    }

    return {
      status: dbStatus.startsWith('down') ? 'degraded' : 'up',
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'aliko-service',
      uptime: process.uptime(),
      database: dbStatus,
    };
  }
}
