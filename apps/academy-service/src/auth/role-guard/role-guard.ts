import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      // If no roles are specified, allow access.
      return true;
    }

    const isHttp = context.getType() === 'http';
    const req = isHttp
      ? context.switchToHttp().getRequest()
      : context.switchToRpc().getData();

    // Get the academyProfile attached by the AcademyProfileGuard
    const academyProfile = req?.academyProfile;

    if (!academyProfile || !academyProfile.role) {
      if (isHttp) {
        throw new ForbiddenException('User profile or role not found.');
      }
      throw new RpcException('User profile or role not found.');
    }

    // Check if the user's role is included in the list of required roles.
    const hasRequiredRole = requiredRoles.some(
      (role) => academyProfile.role === role,
    );

    // WABON Req 2: COMMISSION_AUDITOR has read-only inspection access across student and instructor views
    const isAuditor = academyProfile.role === 'COMMISSION_AUDITOR';
    const handlerName = context.getHandler().name;
    const isReadOperation =
      handlerName.startsWith('get') ||
      handlerName.startsWith('find') ||
      handlerName.startsWith('list') ||
      handlerName.includes('Stats') ||
      handlerName.includes('Progress') ||
      handlerName.includes('Dashboard') ||
      handlerName.includes('Analytics');

    if (isAuditor && isReadOperation) {
      return true;
    }

    if (!hasRequiredRole) {
      if (isHttp) {
        throw new ForbiddenException({
          statusCode: 403,
          message:
            'You do not have the required permissions to perform this action.',
          error: 'Forbidden',
        });
      }
      throw new RpcException({
        statusCode: 403,
        message:
          'You do not have the required permissions to perform this action.',
        error: 'Forbidden',
      });
    }

    return true;
  }
}
