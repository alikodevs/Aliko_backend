import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class AcademyProfileGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToRpc().getData();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No user found in request');
    }

    // Ensure user has Academy profile
    try {
      const profile = await this.userService.getOrCreateProfile(user);
      request.academyProfile = profile;
      return true;
    } catch (_error) {
      throw new UnauthorizedException('Failed to get Academy profile');
    }
  }
}
