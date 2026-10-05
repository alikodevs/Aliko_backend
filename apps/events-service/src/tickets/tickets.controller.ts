import { Controller, UseGuards, UseFilters, UsePipes, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { TicketsService } from "./tickets.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { AuthenticatedUser } from "../user/user.service";
import { EventsProfileGuard } from "../auth/events-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import { CreateTicketSchema, TicketIdSchema } from "./tickets.validation";

@Controller()
@UseGuards(EventsProfileGuard)
@UseFilters(RpcExceptionFilter)
export class TicketsController {
  private readonly logger = new Logger(TicketsController.name);
  constructor(private readonly ticketsService: TicketsService) {}

  @MessagePattern({ cmd: "create_ticket" })
  @UsePipes(new JoiValidationPipe(CreateTicketSchema))
  async create(@Payload() payload: { dto: CreateTicketDto; user: AuthenticatedUser }) {
    this.logger.log(`Creating ticket: ${payload.dto.name} for event: ${payload.dto.eventId}`);
    return this.ticketsService.create(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: "find_event_tickets" })
  async findAll(@Payload() payload: { eventId: string }) {
    this.logger.log(`Fetching tickets for event: ${payload.eventId}`);
    return this.ticketsService.findAllForEvent(payload.eventId);
  }

  @MessagePattern({ cmd: "find_all_tickets" })
  async findAllForUser(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(`Fetching all tickets by user: ${payload.user.firebaseId}`);
    return this.ticketsService.findAllForUser(payload.user);
  }

  @MessagePattern({ cmd: "update_ticket" })
  @UsePipes(new JoiValidationPipe(TicketIdSchema))
  async update(@Payload() payload: { id: string; dto: { name?: string; price?: number; quantity?: number }; user: AuthenticatedUser }) {
    this.logger.log(`Updating ticket ID: ${payload.id} by user: ${payload.user.firebaseId}`);
    return this.ticketsService.update(payload.id, payload.dto, payload.user);
  }

  @MessagePattern({ cmd: "remove_ticket" })
  @UsePipes(new JoiValidationPipe(TicketIdSchema))
  async remove(@Payload() payload: { id: string; user: AuthenticatedUser }) {
    this.logger.log(`Removing ticket ID: ${payload.id} by user: ${payload.user.firebaseId}`);
    return this.ticketsService.remove(payload.id, payload.user);
  }
}
