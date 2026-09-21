import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateClientReportDto } from './dto/create-client-report.dto';
import { lastValueFrom } from 'rxjs';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('Client Reports')
@Controller('client-reports')
@UseGuards(AuthGuard)
export class ClientReportController {
  constructor(@Inject('CONTECH_SERVICE') private contechClient: ClientProxy) {}

  @Post()
  @ApiOperation({ summary: 'Create a new client report' })
  @ApiBody({ type: CreateClientReportDto })
  create(@Request() req: RequestWithUser, @Body() createClientReportDto: CreateClientReportDto) {
    const payload = {
      user: req.user,
      dto: createClientReportDto,
    };
    return lastValueFrom(
      this.contechClient.send({ cmd: 'createClientReport' }, payload),
    );
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get all client reports for a project' })
  @ApiParam({
    name: 'projectId',
    type: Number,
    description: 'ID of the project',
  })
  findAllByProjectId(
    @Request() req: RequestWithUser,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    const payload = {
      user: req.user,
      projectId: projectId,
    };
    return lastValueFrom(
      this.contechClient.send(
        { cmd: 'findAllClientReportsByProjectId' },
        payload,
      ),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client report by its ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the client report',
  })
  findOneById(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) reportId: number) {
    const payload = {
      user: req.user,
      id: reportId,
    };
    return lastValueFrom(
      this.contechClient.send({ cmd: 'findOneClientReportById' }, payload),
    );
  }
}
