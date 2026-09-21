import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const isGlobalAdmin = user.globalRole === 'ADMIN';
    const isCareersAdmin = user.careersRole === 'ADMIN' || user.careersRole === 'RECRUITER';

    if (!isGlobalAdmin && !isCareersAdmin) {
      throw new UnauthorizedException('Only administrators or recruiters can access this resource');
    }

    return true;
  }
}
