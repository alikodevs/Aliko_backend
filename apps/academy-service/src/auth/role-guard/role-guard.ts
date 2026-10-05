import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
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

    if (!requiredRoles) {
      // If no roles are specified, allow access.
      return true;
    }

    const data = context.switchToRpc().getData();

    // Get the academyProfile attached by the AcademyProfileGuard
    const { academyProfile } = data;

    if (!academyProfile || !academyProfile.role) {
      // This should ideally never happen if the AcademyProfileGuard ran first
      throw new RpcException('User profile or role not found.');
    }

    // Check if the user's role is included in the list of required roles.
    const hasRequiredRole = requiredRoles.some(
      (role) => academyProfile.role === role,
    );

    if (!hasRequiredRole) {
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
