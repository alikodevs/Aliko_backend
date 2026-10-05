import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUser, UserService } from '../user/user.service';

@Injectable()
export class ConTechProfileGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToRpc().getData<{
      user?: AuthenticatedUser;
      contechProfile?: import('../user/user.service').ConTechUserProfile;
    }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No user found in request');
    }

    // Ensure user has ConTech profile
    try {
      const profile = await this.userService.getOrCreateProfile(user);
      request.contechProfile = profile;
      return true;
    } catch (_error) {
      throw new UnauthorizedException('Failed to get ConTech profile');
    }
  }
}
