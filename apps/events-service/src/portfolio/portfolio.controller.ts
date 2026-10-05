import { Controller, UseGuards, UseFilters, UsePipes, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { PortfolioService } from "./portfolio.service";
import { CreatePortfolioDto } from "./dto/create-portfolio.dto";
import { AuthenticatedUser } from "../user/user.service";
import { EventsProfileGuard } from "../auth/events-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import { CreatePortfolioSchema, PortfolioIdSchema } from "./portfolio.validation";

@Controller()
@UseGuards(EventsProfileGuard)
@UseFilters(RpcExceptionFilter)
export class PortfolioController {
  private readonly logger = new Logger(PortfolioController.name);
  constructor(private readonly portfolioService: PortfolioService) {}

  @MessagePattern({ cmd: "create_portfolio" })
  @UsePipes(new JoiValidationPipe(CreatePortfolioSchema))
  async create(@Payload() payload: { dto: CreatePortfolioDto; user: AuthenticatedUser }) {
    this.logger.log(`Adding portfolio media "${payload.dto.title}" by user: ${payload.user.firebaseId}`);
    return this.portfolioService.create(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: "find_all_portfolio" })
  async findAll(@Payload() payload: { portal?: string }) {
    this.logger.log(`Fetching portfolio media for portal: ${payload.portal || "all"}`);
    return this.portfolioService.findAll(payload.portal);
  }

  @MessagePattern({ cmd: "remove_portfolio" })
  @UsePipes(new JoiValidationPipe(PortfolioIdSchema))
  async remove(@Payload() payload: { id: string; user: AuthenticatedUser }) {
    this.logger.log(`Removing portfolio media ID: ${payload.id} by user: ${payload.user.firebaseId}`);
    return this.portfolioService.remove(payload.id, payload.user);
  }
}
