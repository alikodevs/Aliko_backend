import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { ROLES_KEY } from '../common/roles/roles.decorator';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class ConshifterRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Call Auth Service to sync & verify Conshifter Role
    try {
      const response: any = await firstValueFrom(
        this.authClient
          .send({ cmd: 'sync_conshifter_user' }, { userId: user.firebaseId || user.uid || user.id })
          .pipe(timeout(5000))
      );

      if (!response || !response.role) {
        return false;
      }

      // We attach the profile so it's accessible down the chain.
      request.conshifterProfile = response;

      return requiredRoles.includes(response.role);
    } catch (err) {
      console.error('Error verifying Conshifter role:', err);
      return false;
    }
  }
}
