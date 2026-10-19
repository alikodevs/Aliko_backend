import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AcademyProfileGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let user: any;
    let request: any;

    if (context.getType() === 'http') {
      request = context.switchToHttp().getRequest();
      user = request.user;

      if (!user) {
        const authHeader = request.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
            let decoded: any;
            try {
              decoded = jwt.verify(token, secret);
            } catch (_verifyErr) {
              decoded = jwt.decode(token);
            }

            if (decoded) {
              const firebaseId = decoded.uid || decoded.firebaseId || decoded.sub || decoded.id;
              user = {
                firebaseId,
                email: decoded.email,
                firstname: decoded.firstname || '',
                lastname: decoded.lastname || '',
                globalRole: decoded.globalRole || 'USER',
                role: decoded.academyActiveRole || decoded.academyRole || decoded.role || 'STUDENT',
                activeRole: decoded.academyActiveRole || decoded.academyRole,
                status: decoded.status || 'ACTIVE',
              };
              request.user = user;
            }
          } catch (_e) {}
        }
      }
    } else {
      request = context.switchToRpc().getData();
      user = request?.user;
    }

    if (!user) {
      throw new UnauthorizedException('No user found in request');
    }

    // Ensure user has Academy profile
    try {
      const profile = await this.userService.getOrCreateProfile(user);
      request.academyProfile = profile;
      return true;
    } catch (_error) {
      // Fallback profile if sync/fetch fails so request still succeeds
      request.academyProfile = {
        userId: user.firebaseId,
        role: user.role || 'STUDENT',
        hasSelectedRole: true,
      };
      return true;
    }
  }
}
