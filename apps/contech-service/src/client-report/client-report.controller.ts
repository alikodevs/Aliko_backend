import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  UseFilters,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClientReportService } from './client-report.service';
import { CreateClientReportDto } from './dto/create-client-report.dto';
import { AuthenticatedUser } from '../user/user.service';
import { ConTechProfileGuard, RoleGuard, Roles } from '../auth';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateClientReportSchema,
  GetProjectReportsSchema,
  ReportIdSchema,
} from './client-report.validation';

@Controller()
@UseGuards(ConTechProfileGuard)
@UseFilters(RpcExceptionFilter)
export class ClientReportController {
  private readonly logger = new Logger(ClientReportController.name);
  constructor(private readonly clientReportsService: ClientReportService) {}

  @MessagePattern({ cmd: 'createClientReport' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(CreateClientReportSchema))
  async create(
    @Payload() payload: { dto: CreateClientReportDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating client report for project ID: ${payload.dto.projectId} by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.clientReportsService.create(payload.dto, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to create client report for project ID ${payload.dto.projectId} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'findAllClientReportsByProjectId' })
  @UsePipes(new JoiValidationPipe(GetProjectReportsSchema))
  async findAllByProjectId(
    @Payload() payload: { projectId: number; user: AuthenticatedUser },
  ) {
    // Controller expects 'id' in method but schema/payload might call it 'projectId'
    this.logger.log(
      `Fetching reports for project ID: ${payload.projectId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.clientReportsService.findAllByProjectId(
        payload.projectId,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch reports for project ID ${payload.projectId} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'findOneClientReportById' })
  @UsePipes(new JoiValidationPipe(ReportIdSchema))
  async findOneById(
    @Payload() payload: { id: number; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Fetching report details for ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.clientReportsService.findOneById(
        payload.id,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch report detail for ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
