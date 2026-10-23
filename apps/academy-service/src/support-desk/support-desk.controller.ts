import { Controller, UseGuards, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SupportDeskService } from './support-desk.service';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  ListSupportTicketsDto,
} from './dto';
import {
  createSupportTicketSchema,
  updateSupportTicketSchema,
  listSupportTicketsSchema,
} from './support-desk.validation';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { AcademyRole } from '@prisma/client/academy';
import { AuthenticatedUser } from '../user/user.service';

@Controller()
@UseGuards(AcademyProfileGuard, RoleGuard)
export class SupportDeskController {
  constructor(private readonly supportDeskService: SupportDeskService) {}

  @MessagePattern('create_support_ticket')
  @UsePipes(new JoiValidationPipe(createSupportTicketSchema))
  async createTicket(
    @Payload() payload: { dto: CreateSupportTicketDto; user: AuthenticatedUser },
  ) {
    return this.supportDeskService.createTicket(payload.user.firebaseId, payload.dto);
  }

  @MessagePattern('get_my_support_tickets')
  async getMyTickets(@Payload() payload: { user: AuthenticatedUser }) {
    return this.supportDeskService.getMyTickets(payload.user.firebaseId);
  }

  @MessagePattern('get_support_ticket_by_id')
  async getTicketById(
    @Payload() payload: { ticketId: number; user: AuthenticatedUser },
  ) {
    return this.supportDeskService.getTicketById(
      payload.ticketId,
      payload.user.firebaseId,
      payload.user.role,
    );
  }

  @MessagePattern('list_all_support_tickets')
  @Roles(
    AcademyRole.ADMIN,
    AcademyRole.COURSE_MANAGER,
    AcademyRole.INSTRUCTOR,
    AcademyRole.COMMISSION_AUDITOR,
  )
  @UsePipes(new JoiValidationPipe(listSupportTicketsSchema))
  async listAllTickets(
    @Payload() payload: { dto: ListSupportTicketsDto; user: AuthenticatedUser },
  ) {
    return this.supportDeskService.listAllTickets(payload.dto);
  }

  @MessagePattern('update_support_ticket')
  @Roles(AcademyRole.ADMIN, AcademyRole.COURSE_MANAGER, AcademyRole.INSTRUCTOR)
  @UsePipes(new JoiValidationPipe(updateSupportTicketSchema))
  async updateTicket(
    @Payload() payload: { dto: UpdateSupportTicketDto; user: AuthenticatedUser },
  ) {
    return this.supportDeskService.updateTicketStatus(payload.dto);
  }

  @MessagePattern('get_system_requirements')
  async getSystemRequirements() {
    return this.supportDeskService.getSystemRequirements();
  }
}
