import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { toRpcException } from '../common/utils/to-rpc-exception';
import {
  CreateAnnouncementSchema,
  FindAnnouncementsSchema,
  AnnouncementIdSchema,
  FindOneAnnouncementSchema,
  UpdateAnnouncementSchema,
} from './announcements.validation';

@Controller()
export class AnnouncementsController {
  private readonly logger = new Logger(AnnouncementsController.name);

  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post(['announcements', 'academy/announcements'])
  @MessagePattern({ cmd: 'create_announcement' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateAnnouncementSchema))
  async create(
    @Body() body?: CreateAnnouncementDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CreateAnnouncementDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Announcement data required');
    }
    this.logger.log(
      `Creating announcement "${dto.title}" by user: ${user.firebaseId}`,
    );
    try {
      return await this.announcementsService.create(dto, user);
    } catch (error) {
      this.logger.error(
        `Failed to create announcement "${dto.title}" by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Get(['announcements', 'academy/announcements'])
  @MessagePattern({ cmd: 'find_all_announcements' })
  async findAll(
    @Payload() payload?: { query?: any },
    @Query() query?: any,
  ) {
    const q = payload?.query || query || {};
    this.logger.log(
      `Fetching all announcements with query: ${JSON.stringify(q)}`,
    );
    try {
      return await this.announcementsService.findAll(q);
    } catch (error) {
      this.logger.error(
        `Failed to fetch all announcements with query ${JSON.stringify(q)}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Get(['announcements/:id', 'academy/announcements/:id'])
  @MessagePattern({ cmd: 'find_announcement_by_id' })
  @UsePipes(new JoiValidationPipe(FindOneAnnouncementSchema))
  async findOne(
    @Param('id') paramId?: string,
    @Payload() payload?: { id: number },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid announcement ID');
    }
    this.logger.log(`Fetching announcement ID: ${id}`);
    try {
      return await this.announcementsService.findOne(id);
    } catch (error) {
      this.logger.error(
        `Failed to fetch announcement ID ${id}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Put(['announcements/:id', 'academy/announcements/:id'])
  @Patch(['announcements/:id', 'academy/announcements/:id'])
  @MessagePattern({ cmd: 'update_announcement' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateAnnouncementSchema))
  async update(
    @Param('id') paramId?: string,
    @Body() body?: UpdateAnnouncementDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      dto: UpdateAnnouncementDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid announcement ID');
    }
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Update data required');
    }
    this.logger.log(
      `Updating announcement ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.announcementsService.update(
        id,
        dto,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update announcement ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Delete(['announcements/:id', 'academy/announcements/:id'])
  @MessagePattern({ cmd: 'remove_announcement' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(AnnouncementIdSchema))
  async remove(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid announcement ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Removing announcement ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.announcementsService.remove(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to remove announcement ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }
}
