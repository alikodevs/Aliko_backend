import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RpcException } from "@nestjs/microservices";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const data = context.switchToRpc().getData<{ user?: { role?: string } }>();
    const userRole = data.user?.role;

    if (!userRole) {
      throw new RpcException("User role not found.");
    }

    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      throw new RpcException("Access denied. Insufficient permissions.");
    }

    return true;
  }
}
