import { Controller, UseGuards, UseFilters, UsePipes, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { RsvpsService } from "./rsvps.service";
import { CreateRsvpDto } from "./dto/create-rsvp.dto";
import { AuthenticatedUser } from "../user/user.service";
import { EventsProfileGuard } from "../auth/events-profile.guard";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import { JoiValidationPipe } from "../validation.pipe";
import { CreateRsvpSchema, RsvpIdSchema, UpdateRsvpStatusSchema, UserOnlySchema } from "./rsvps.validation";

@Controller()
@UseFilters(RpcExceptionFilter)
export class RsvpsController {
  private readonly logger = new Logger(RsvpsController.name);
  constructor(private readonly rsvpsService: RsvpsService) {}

  @MessagePattern({ cmd: "create_rsvp" })
  @UsePipes(new JoiValidationPipe(CreateRsvpSchema))
  async create(@Payload() payload: { dto: CreateRsvpDto }) {
    this.logger.log(`Creating RSVP for guest ${payload.dto.guestEmail} at event ${payload.dto.eventId}`);
    try {
      const result = await this.rsvpsService.create(payload.dto);
      this.logger.log(`RSVP successfully created for ${payload.dto.guestEmail}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error creating RSVP: ${error.message} - ${error.stack}`);
      throw error;
    }
  }

  @MessagePattern({ cmd: "update_rsvp_status" })
  @UsePipes(new JoiValidationPipe(UpdateRsvpStatusSchema))
  async updateStatus(@Payload() payload: { id: string; dto: { response: string } }) {
    this.logger.log(`Updating RSVP status for ID ${payload.id} to ${payload.dto.response}`);
    try {
      const result = await this.rsvpsService.updateStatus(payload.id, payload.dto.response);
      this.logger.log(`RSVP status successfully updated for ID ${payload.id}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error updating RSVP status: ${error.message} - ${error.stack}`);
      throw error;
    }
  }

  @MessagePattern({ cmd: "find_all_rsvps" })
  @UseGuards(EventsProfileGuard)
  @UsePipes(new JoiValidationPipe(UserOnlySchema))
  async findAll(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(`Fetching RSVPs for user: ${payload.user.firebaseId}`);
    return this.rsvpsService.findAllForMyEvents(payload.user);
  }

  @MessagePattern({ cmd: "remove_rsvp" })
  @UseGuards(EventsProfileGuard)
  @UsePipes(new JoiValidationPipe(RsvpIdSchema))
  async remove(@Payload() payload: { id: string; user: AuthenticatedUser }) {
    this.logger.log(`Removing RSVP ID: ${payload.id} by user: ${payload.user.firebaseId}`);
    return this.rsvpsService.remove(payload.id, payload.user);
  }
}
