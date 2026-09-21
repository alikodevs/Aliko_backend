import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { CreateAnnouncementSchema, FindAnnouncementsSchema, AnnouncementIdSchema } from './announcements.validation';

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
      throw error;
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
      throw error;
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
      throw error;
    }
  }
}

