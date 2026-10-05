import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@aliko/common';

@Controller('health')
export class HealthController {
  @Get()
  checkHealth() {
    return ApiResponse.ok({
      status: 'UP',
      gateway: 'Aliko Unified API Gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
}
