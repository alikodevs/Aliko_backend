import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { firstValueFrom, throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

@ApiTags('Announcements')
@Controller('academy/announcements')
export class AnnouncementController {
  private readonly logger = new Logger(AnnouncementController.name);

  constructor(@Inject('ACADEMY_SERVICE') private academyClient: ClientProxy) {}

  private handleError(error: any, operation: string) {
    this.logger.error(`${operation} failed:`, error);
    
    if (error instanceof TimeoutError) {
      throw new HttpException('Academy service timeout', HttpStatus.GATEWAY_TIMEOUT);
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new HttpException('Academy service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }

    let status = HttpStatus.BAD_REQUEST;
    if (typeof error?.statusCode === 'number') {
      status = error.statusCode;
    } else if (typeof error?.status === 'number') {
      status = error.status;
    }

    const message = error?.message || 'Error from academy microservice';
    const errorType = error?.error || 'Microservice Error';

    throw new HttpException({
      statusCode: status,
      message,
      error: errorType,
      details: error?.details || error?.stack || null
    }, status);
  }

  // Create announcement (Instructor / Admin only)
  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Create announcement',
    description: '🔒 Instructor / Admin only',
  })
  @ApiResponse({ status: 201, description: 'Announcement created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBody({ type: CreateAnnouncementDto })
  async createAnnouncement(@Request() req: RequestWithUser, @Body() dto: CreateAnnouncementDto) {
    const payload = {
      dto,
      user: req.user,
    };
    return firstValueFrom(
      this.academyClient.send({ cmd: 'create_announcement' }, payload).pipe(
        timeout(10000),
        catchError((error) => {
          this.handleError(error, 'Academy Create Announcement');
          return throwError(() => error);
        }),
      ),
    );
  }

  // Get all announcements
  @Get()
  @ApiOperation({ summary: 'Get all announcements' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAllAnnouncements(@Query() query?: any) {
    const payload = {
      query,
    };
    return firstValueFrom(
      this.academyClient.send({ cmd: 'find_all_announcements' }, payload).pipe(
        timeout(10000),
        catchError((error) => {
          this.handleError(error, 'Academy Find All Announcements');
          return throwError(() => error);
        }),
      ),
    );
  }

  // Get announcement by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get announcement by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Announcement retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async findOneAnnouncement(@Param('id', ParseIntPipe) id: number) {
    const payload = {
      id,
    };
    return firstValueFrom(
      this.academyClient.send({ cmd: 'find_announcement_by_id' }, payload).pipe(
        timeout(10000),
        catchError((error) => {
          this.handleError(error, 'Academy Find Announcement By ID');
          return throwError(() => error);
        }),
      ),
    );
  }

  // Update announcement (PUT) (Instructor / Admin only)
  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Update announcement (PUT)',
    description: '🔒 Instructor / Admin only',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Announcement updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  @ApiBody({ type: UpdateAnnouncementDto })
  async updateAnnouncementPut(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.updateAnnouncement(req, id, dto);
  }

  // Update announcement (PATCH) (Instructor / Admin only)
  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Update announcement (PATCH)',
    description: '🔒 Instructor / Admin only',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Announcement updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  @ApiBody({ type: UpdateAnnouncementDto })
  async updateAnnouncementPatch(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.updateAnnouncement(req, id, dto);
  }

  private async updateAnnouncement(
    req: RequestWithUser,
    id: number,
    dto: UpdateAnnouncementDto,
  ) {
    const payload = {
      id,
      dto,
      user: req.user,
    };
    return firstValueFrom(
      this.academyClient.send({ cmd: 'update_announcement' }, payload).pipe(
        timeout(10000),
        catchError((error) => {
          this.handleError(error, 'Academy Update Announcement');
          return throwError(() => error);
        }),
      ),
    );
  }

  // Delete announcement (Instructor / Admin only)
  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Delete announcement',
    description: '🔒 Instructor / Admin only',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Announcement deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async removeAnnouncement(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const payload = {
      id,
      user: req.user,
    };
    return firstValueFrom(
      this.academyClient.send({ cmd: 'remove_announcement' }, payload).pipe(
        timeout(10000),
        catchError((error) => {
          this.handleError(error, 'Academy Delete Announcement');
          return throwError(() => error);
        }),
      ),
    );
  }
}

