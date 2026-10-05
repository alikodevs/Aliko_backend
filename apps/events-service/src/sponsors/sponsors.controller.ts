import {
  Controller,
  UseGuards,
  UseFilters,
  UsePipes,
  Logger,
} from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { SponsorsService } from "./sponsors.service";
import { CreateSponsorDto } from "./dto/create-sponsor.dto";
import { AuthenticatedUser } from "../user/user.service";
import { EventsProfileGuard } from "../auth/events-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import { CreateSponsorSchema, SponsorIdSchema } from "./sponsors.validation";

@Controller()
@UseGuards(EventsProfileGuard)
@UseFilters(RpcExceptionFilter)
export class SponsorsController {
  private readonly logger = new Logger(SponsorsController.name);
  constructor(private readonly sponsorsService: SponsorsService) {}

  @MessagePattern({ cmd: "create_sponsor" })
  @UsePipes(new JoiValidationPipe(CreateSponsorSchema))
  async create(
    @Payload() payload: { dto: CreateSponsorDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating sponsor "${payload.dto.name}" by ${payload.user.firebaseId}`,
    );
    return this.sponsorsService.create(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: "remove_sponsor" })
  @UsePipes(new JoiValidationPipe(SponsorIdSchema))
  async remove(@Payload() payload: { id: string; user: AuthenticatedUser }) {
    return this.sponsorsService.remove(payload.id, payload.user);
  }
}
