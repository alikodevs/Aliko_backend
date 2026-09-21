import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { ParseJsonPipe } from '../../common/pipes/parse-json.pipe';
import { lastValueFrom } from 'rxjs';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { PaginationDto } from './dto/pagination.dto';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Inspections')
@ApiBearerAuth()
@Controller('inspections')
@UseGuards(AuthGuard)
export class InspectionController {
  constructor(@Inject('CONTECH_SERVICE') private contechClient: ClientProxy) {}

  @Post()
  @ApiOperation({ summary: 'Create a new inspection' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @UseInterceptors(FilesInterceptor('photos', 10))
  create(
    @Request() req: RequestWithUser,
    @UploadedFiles() files?: Array<Express.Multer.File>,
    @Body() body?: any,
  ) {
    // Handle both multipart (body.data is JSON string) and raw JSON
    let createInspectionDto = body;
    if (body?.data) {
      createInspectionDto = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
    }

    const serializedFiles = files?.map((file) => ({
      originalname: file.originalname,
      buffer: file.buffer.toString('base64'),
    })) || [];

    const payload = {
      user: req.user,
      dto: createInspectionDto,
      files: serializedFiles,
    };
    return this.contechClient.send({ cmd: 'create_Inspection' }, payload);
  }

  @Get()
  @ApiOperation({ summary: 'Get all inspections for a user with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req: RequestWithUser,
    @Query() pagination: PaginationDto,
  ) {
    const payload = { user: req.user, pagination };
    return lastValueFrom(
      this.contechClient.send({ cmd: 'find_all_inspections' }, payload),
    );
  }

  @Get('project/:projectId')
  @ApiOperation({
    summary: 'Get all inspections for a project with pagination',
  })
  @ApiParam({ name: 'projectId', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAllByProjectId(
    @Request() req: RequestWithUser,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() paginationDto: PaginationDto,
  ) {
    const payload = { user: req.user, projectId, pagination: paginationDto };
    return lastValueFrom(
      this.contechClient.send({ cmd: 'findAllInspections' }, payload),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single inspection by ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    const payload = { user: req.user, id };
    return lastValueFrom(this.contechClient.send('findOneInspection', payload));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing inspection' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateInspectionDto })
  update(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInspectionDto: Omit<UpdateInspectionDto, 'id'>,
  ) {
    const payload = { user: req.user, id, updateInspectionDto };
    return lastValueFrom(this.contechClient.send('updateInspection', payload));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an inspection by ID' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    const payload = { user: req.user, id };
    return lastValueFrom(this.contechClient.send('removeInspection', payload));
  }

  @Patch(':id/finalize')
  @ApiOperation({ summary: 'Finalize an inspection' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ schema: { properties: { status: { type: 'string', example: 'PASSED' } } } })
  finalize(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    const payload = { user: req.user, id, status };
    return lastValueFrom(this.contechClient.send('finalizeInspection', payload));
  }
}
