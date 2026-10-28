import {
  Controller,
  UseGuards,
  UsePipes,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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

  @Post(['support-desk/tickets', 'academy/support-desk/tickets'])
  @MessagePattern('create_support_ticket')
  @UsePipes(new JoiValidationPipe(createSupportTicketSchema))
  async createTicket(
    @Body() body?: CreateSupportTicketDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CreateSupportTicketDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Ticket data is required');
    }
    return this.supportDeskService.createTicket(user.firebaseId, dto);
  }

  @Get(['support-desk/tickets/me', 'academy/support-desk/tickets/me'])
  @MessagePattern('get_my_support_tickets')
  async getMyTickets(
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.supportDeskService.getMyTickets(user.firebaseId);
  }

  @Get(['support-desk/tickets/:ticketId', 'academy/support-desk/tickets/:ticketId'])
  @MessagePattern('get_support_ticket_by_id')
  async getTicketById(
    @Param('ticketId') paramTicketId?: string,
    @Req() req?: any,
    @Payload() payload?: { ticketId: number; user: AuthenticatedUser },
  ) {
    const rawTicketId = payload?.ticketId !== undefined ? payload.ticketId : paramTicketId;
    const ticketId = Number(rawTicketId);
    if (!ticketId || isNaN(ticketId)) {
      throw new BadRequestException('Invalid ticket ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.supportDeskService.getTicketById(
      ticketId,
      user.firebaseId,
      user.role,
    );
  }

  @Get(['support-desk/tickets', 'academy/support-desk/tickets'])
  @MessagePattern('list_all_support_tickets')
  @Roles(
    AcademyRole.ADMIN,
    AcademyRole.COURSE_MANAGER,
    AcademyRole.INSTRUCTOR,
    AcademyRole.COMMISSION_AUDITOR,
  )
  @UsePipes(new JoiValidationPipe(listSupportTicketsSchema))
  async listAllTickets(
    @Query() query?: any,
    @Req() req?: any,
    @Payload() payload?: { dto: ListSupportTicketsDto; user: AuthenticatedUser },
  ) {
    const rawDto = payload?.dto || query || {};
    const dto: ListSupportTicketsDto = {
      ...rawDto,
      page: rawDto.page ? Number(rawDto.page) : undefined,
      limit: rawDto.limit ? Number(rawDto.limit) : undefined,
    };
    return this.supportDeskService.listAllTickets(dto);
  }

  @Patch(['support-desk/tickets/:ticketId', 'academy/support-desk/tickets/:ticketId'])
  @MessagePattern('update_support_ticket')
  @Roles(AcademyRole.ADMIN, AcademyRole.COURSE_MANAGER, AcademyRole.INSTRUCTOR)
  @UsePipes(new JoiValidationPipe(updateSupportTicketSchema))
  async updateTicket(
    @Param('ticketId') paramTicketId?: string,
    @Body() body?: UpdateSupportTicketDto,
    @Req() req?: any,
    @Payload() payload?: { dto: UpdateSupportTicketDto; user: AuthenticatedUser },
  ) {
    const rawTicketId = payload?.dto?.ticketId !== undefined ? payload.dto.ticketId : paramTicketId;
    const ticketId = Number(rawTicketId);
    if (!ticketId || isNaN(ticketId)) {
      throw new BadRequestException('Invalid ticket ID');
    }
    const rawDto = payload?.dto || body || {};
    const dto: UpdateSupportTicketDto = { ...rawDto, ticketId };
    return this.supportDeskService.updateTicketStatus(dto);
  }

  @Get(['support-desk/system-requirements', 'academy/support-desk/system-requirements'])
  @MessagePattern('get_system_requirements')
  async getSystemRequirements() {
    return this.supportDeskService.getSystemRequirements();
  }
}
