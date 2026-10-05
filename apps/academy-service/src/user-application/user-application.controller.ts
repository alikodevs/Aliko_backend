import { Controller, UsePipes, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { UserApplicationService } from './user-application.service';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { UserPromotionEventSchema } from './user-application.validation';

@Controller()
export class UserApplicationController {
  private readonly logger = new Logger(UserApplicationController.name);
  constructor(private readonly applicationService: UserApplicationService) {}

  @EventPattern('user.promotion.academy')
  @UsePipes(new JoiValidationPipe(UserPromotionEventSchema))
  async handleUserPromotion(
    @Payload() payload: { userId: string; role: string },
  ) {
    this.logger.log(
      `Handling user promotion event for user: ${payload.userId} to role: ${payload.role}`,
    );
    try {
      await this.applicationService.updateUserRole(
        payload.userId,
        payload.role,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to handle user promotion event for user ${payload.userId} to role ${payload.role}: ${errorMessage}`,
      );
      // Events don't need to rethrow necessarily, but good for logging
    }
  }
}
