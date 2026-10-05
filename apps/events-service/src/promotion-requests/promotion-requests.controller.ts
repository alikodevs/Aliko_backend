import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  UseFilters,
} from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { PromotionRequestsService } from "./promotion-requests.service";
import { CreatePromotionRequestDto } from "./dto/create-promotion-request.dto";
import { AuthenticatedUser } from "../user/user.service";
import { EventsProfileGuard } from "../auth/events-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import {
  CreatePromotionRequestSchema,
  PromotionRequestIdSchema,
} from "./promotion-requests.validation";

@Controller()
@UseFilters(RpcExceptionFilter)
export class PromotionRequestsController {
  private readonly logger = new Logger(PromotionRequestsController.name);
  constructor(private readonly service: PromotionRequestsService) {}

  @MessagePattern({ cmd: "submit_promotion_request" })
  @UsePipes(new JoiValidationPipe(CreatePromotionRequestSchema))
  async create(@Payload() { userId, ...dto }: CreatePromotionRequestDto & { userId?: string }) {
    this.logger.log(
      `Submitting new promotion request from company: ${dto.companyName}`,
    );
    try {
      return await this.service.create(dto, userId);
    } catch (error) {
      this.logger.error(
        `Failed to submit promotion request for ${dto.companyName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "find_my_promotion_requests" })
  async findMyRequests(@Payload() payload: { userId: string }) {
    this.logger.log(`Fetching promotion requests for user: ${payload.userId}`);
    return this.service.findMyRequests(payload.userId);
  }

  @MessagePattern({ cmd: "find_all_promotion_requests" })
  @UseGuards(EventsProfileGuard)
  async findAll(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching all promotion requests by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.service.findAll(payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch promotion requests for admin ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "mark_promotion_request_reviewed" })
  @UseGuards(EventsProfileGuard)
  @UsePipes(new JoiValidationPipe(PromotionRequestIdSchema))
  async markAsReviewed(
    @Payload() payload: { id: string; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Marking promotion request ID: ${payload.id} as reviewed by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.service.markAsReviewed(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to update promotion request ID ${payload.id} by admin ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: "convert_promotion_to_event" })
  @UseGuards(EventsProfileGuard)
  @UsePipes(new JoiValidationPipe(PromotionRequestIdSchema))
  async convertToEvent(
    @Payload() payload: { id: string; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Converting promotion request ID: ${payload.id} to event draft by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.service.convertToEvent(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to convert request ID ${payload.id} by admin ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
