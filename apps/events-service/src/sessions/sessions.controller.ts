import {
  Controller,
  UseGuards,
  UseFilters,
  UsePipes,
  Logger,
} from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { SessionsService } from "./sessions.service";
import { CreateSessionDto } from "./dto/create-session.dto";
import { AuthenticatedUser } from "../user/user.service";
import { EventsProfileGuard } from "../auth/events-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import { CreateSessionSchema, SessionIdSchema } from "./sessions.validation";

@Controller()
@UseGuards(EventsProfileGuard)
@UseFilters(RpcExceptionFilter)
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);
  constructor(private readonly sessionsService: SessionsService) {}

  @MessagePattern({ cmd: "create_session" })
  @UsePipes(new JoiValidationPipe(CreateSessionSchema))
  async create(
    @Payload() payload: { dto: CreateSessionDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating session "${payload.dto.title}" by ${payload.user.firebaseId}`,
    );
    return this.sessionsService.create(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: "remove_session" })
  @UsePipes(new JoiValidationPipe(SessionIdSchema))
  async remove(@Payload() payload: { id: string; user: AuthenticatedUser }) {
    return this.sessionsService.remove(payload.id, payload.user);
  }
}
