import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { UserService } from "../user/user.service";

@Injectable()
export class EventsProfileGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToRpc().getData();

    // Allow public access based on payload flag
    if (request && request.public === true) {
      return true;
    }

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("No user found in request");
    }

    // Ensure user has Events profile
    try {
      const profile = await this.userService.getProfileAndSync(user);
      if (!profile) {
        return false;
      }
      request.eventsProfile = profile;
      return true;
    } catch (_error) {
      throw new UnauthorizedException("Failed to get Events profile");
    }
  }
}
