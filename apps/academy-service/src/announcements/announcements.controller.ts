import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
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

  @MessagePattern({ cmd: 'create_announcement' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateAnnouncementSchema))
  async create(
    @Payload() payload: { dto: CreateAnnouncementDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating announcement "${payload.dto.title}" by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.announcementsService.create(payload.dto, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to create announcement "${payload.dto.title}" by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'find_all_announcements' })
  @UsePipes(new JoiValidationPipe(FindAnnouncementsSchema))
  async findAll(@Payload() payload: { query?: any }) {
    this.logger.log(
      `Fetching all announcements with query: ${JSON.stringify(payload.query || {})}`,
    );
    try {
      return await this.announcementsService.findAll(payload.query);
    } catch (error) {
      this.logger.error(
        `Failed to fetch all announcements with query ${JSON.stringify(payload.query || {})}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'find_announcement_by_id' })
  @UsePipes(new JoiValidationPipe(FindOneAnnouncementSchema))
  async findOne(@Payload() payload: { id: number }) {
    this.logger.log(`Fetching announcement ID: ${payload.id}`);
    try {
      return await this.announcementsService.findOne(payload.id);
    } catch (error) {
      this.logger.error(
        `Failed to fetch announcement ID ${payload.id}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'update_announcement' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateAnnouncementSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      dto: UpdateAnnouncementDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating announcement ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.announcementsService.update(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update announcement ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'remove_announcement' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(AnnouncementIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing announcement ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.announcementsService.remove(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to remove announcement ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }
}

