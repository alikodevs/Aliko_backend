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
  Param,
  Body,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { toRpcException } from '../common/utils/to-rpc-exception';
import {
  CreateNotificationSchema,
  NotificationIdSchema,
  UserOnlyNotificationSchema,
  InternalProgressSchema,
  InternalInstructorNotifySchema,
} from './notifications.validation';

@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);
  constructor(private readonly service: NotificationsService) {}

  @Post(['notifications', 'academy/notifications'])
  @MessagePattern({ cmd: 'create_notification' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateNotificationSchema))
  async create(
    @Body() body?: CreateNotificationDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CreateNotificationDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Notification data required');
    }
    this.logger.log(
      `Creating notification for user: ${dto.userId} by: ${user.firebaseId}`,
    );
    try {
      return await this.service.createNotification(user, dto);
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${dto.userId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Get(['notifications/me', 'academy/notifications/me'])
  @MessagePattern({ cmd: 'get_my_notifications' })
  @UseGuards(AcademyProfileGuard)
  async myNotifications(
    @Payload() payload?: { user: AuthenticatedUser },
    @Req() req?: any,
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `User ${user.firebaseId} is fetching their notifications`,
    );
    try {
      return await this.service.getUserNotifications(user);
    } catch (error) {
      this.logger.error(
        `User ${user.firebaseId} failed to fetch their notifications: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Get(['notifications/:id', 'academy/notifications/:id'])
  @MessagePattern({ cmd: 'get_notification_by_id' })
  @UseGuards(AcademyProfileGuard)
  @UsePipes(new JoiValidationPipe(NotificationIdSchema))
  async getById(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid notification ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `User ${user.firebaseId} fetching notification ${id}`,
    );
    try {
      return await this.service.getNotificationById(user, id);
    } catch (error) {
      this.logger.error(
        `User ${user.firebaseId} failed to fetch notification ${id}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Put(['notifications/:id/read', 'academy/notifications/:id/read'])
  @Patch(['notifications/:id/read', 'academy/notifications/:id/read'])
  @MessagePattern({ cmd: 'mark_notification_read' })
  @UseGuards(AcademyProfileGuard)
  @UsePipes(new JoiValidationPipe(NotificationIdSchema))
  async markRead(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid notification ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `User ${user.firebaseId} marking notification ${id} as read`,
    );
    try {
      return await this.service.markAsRead(user, id);
    } catch (error) {
      this.logger.error(
        `User ${user.firebaseId} failed to mark notification ${id} as read: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Delete(['notifications/:id', 'academy/notifications/:id'])
  @MessagePattern({ cmd: 'delete_notification' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(NotificationIdSchema))
  async delete(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid notification ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `User ${user.firebaseId} deleting notification ${id}`,
    );
    try {
      return await this.service.deleteNotification(user, id);
    } catch (error) {
      this.logger.error(
        `User ${user.firebaseId} failed to delete notification ${id}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'internal_create_progress_notification' })
  @UsePipes(new JoiValidationPipe(InternalProgressSchema))
  async createProgressNotification(
    @Payload() payload: { userId: string; message: string },
  ) {
    this.logger.log(
      `Internal: Creating progress notification for user ${payload.userId}`,
    );
    try {
      return await this.service.createProgressNotification(
        payload.userId,
        payload.message,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create internal progress notification for user ${payload.userId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'internal_notify_instructor' })
  @UsePipes(new JoiValidationPipe(InternalInstructorNotifySchema))
  async notifyInstructor(
    @Payload()
    payload: {
      studentId: string;
      courseId: number;
      moduleTitle: string;
    },
  ) {
    this.logger.log(
      `Internal: Notifying instructors about student ${payload.studentId} finishing module: ${payload.moduleTitle}`,
    );
    try {
      return await this.service.notifyInstructorProgress(
        payload.studentId,
        payload.courseId,
        payload.moduleTitle,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify instructors for student ${payload.studentId} in course ${payload.courseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }
}
