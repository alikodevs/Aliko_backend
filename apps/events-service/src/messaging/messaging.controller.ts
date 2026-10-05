import { Controller, UseGuards, UseFilters, UsePipes, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { MessagingService } from "./messaging.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { AuthenticatedUser } from "../user/user.service";
import { EventsProfileGuard } from "../auth/events-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import { SendMessageSchema, UserOnlySchema } from "./messaging.validation";

@Controller()
@UseGuards(EventsProfileGuard)
@UseFilters(RpcExceptionFilter)
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(private readonly messagingService: MessagingService) {}

  @MessagePattern({ cmd: "send_event_message" })
  @UsePipes(new JoiValidationPipe(SendMessageSchema))
  async sendMessage(
    @Payload() payload: { id: string; dto: SendMessageDto; user: AuthenticatedUser }
  ) {
    this.logger.log(`User ${payload.user.firebaseId} is sending message for event ${payload.id}`);
    return this.messagingService.sendMessage(payload.id, payload.dto, payload.user);
  }

  @MessagePattern({ cmd: "get_messaging_stats" })
  @UsePipes(new JoiValidationPipe(UserOnlySchema))
  async getStats(@Payload() payload: { user: AuthenticatedUser }) {
    return this.messagingService.getRecentStats(payload.user);
  }
}
