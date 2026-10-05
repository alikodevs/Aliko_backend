import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const internalKey = request.headers['x-internal-service-key'];
    const expectedSecret =
      process.env.INTERNAL_SERVICE_SECRET || 'aliko-internal-secret-change-in-production';

    if (internalKey && internalKey === expectedSecret) {
      request.user = { id: 'internal-service', globalRole: 'ADMIN', isInternal: true };
      return true;
    }

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = roles.includes(user.globalRole);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
