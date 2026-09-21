import { Controller, UseGuards, UseFilters, UsePipes, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { RegistrationsService } from "./registrations.service";
import { CreateRegistrationDto } from "./dto/create-registration.dto";
import { AuthenticatedUser } from "../user/user.service";
import { EventsProfileGuard } from "../auth/events-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import { CreateRegistrationSchema, RegistrationIdSchema, EventIdSchema, CheckInAttendeeSchema, UserOnlySchema } from "./registrations.validation";

@Controller()
@UseGuards(EventsProfileGuard)
@UseFilters(RpcExceptionFilter)
export class RegistrationsController {
  private readonly logger = new Logger(RegistrationsController.name);
  constructor(private readonly registrationsService: RegistrationsService) {}

  @MessagePattern({ cmd: "create_registration" })
  @UsePipes(new JoiValidationPipe(CreateRegistrationSchema))
  async create(@Payload() payload: { dto: CreateRegistrationDto; user?: AuthenticatedUser }) {
    this.logger.log(`Registering attendee ${payload.dto.attendeeEmail} for event ${payload.dto.eventId}`);
    return this.registrationsService.create(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: "find_all_registrations" })
  @UsePipes(new JoiValidationPipe(UserOnlySchema))
  async findAll(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(`Fetching registrations for user: ${payload.user.firebaseId}`);
    return this.registrationsService.findAllForMyEvents(payload.user);
  }

  @MessagePattern({ cmd: "toggle_checkin" })
  @UsePipes(new JoiValidationPipe(RegistrationIdSchema))
  async toggleCheckIn(@Payload() payload: { id: string; user: AuthenticatedUser }) {
    this.logger.log(`Toggling check-in for registration ID: ${payload.id}`);
    return this.registrationsService.toggleCheckIn(payload.id, payload.user);
  }

  @MessagePattern({ cmd: "find_my_tickets" })
  @UsePipes(new JoiValidationPipe(UserOnlySchema))
  async findMyTickets(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(`Fetching tickets for user: ${payload.user.firebaseId}`);
    return this.registrationsService.findAllMyRegistrations(payload.user);
  }

  @MessagePattern({ cmd: "find_event_attendees" })
  @UsePipes(new JoiValidationPipe(EventIdSchema))
  async findForEvent(@Payload() payload: { id: string; user: AuthenticatedUser }) {
    this.logger.log(`Fetching attendees for event ID: ${payload.id}`);
    return this.registrationsService.findForEvent(payload.id, payload.user);
  }

  @MessagePattern({ cmd: "checkin_attendee" })
  @UsePipes(new JoiValidationPipe(CheckInAttendeeSchema))
  async checkIn(@Payload() payload: { id: string; registrationId: string; user: AuthenticatedUser }) {
    this.logger.log(`Checking in attendee with registration ID: ${payload.registrationId} for event ID: ${payload.id}`);
    return this.registrationsService.checkIn(payload.registrationId, payload.id, payload.user);
  }
}
