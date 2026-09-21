import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
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
@UseGuards(AcademyProfileGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);
  constructor(private readonly service: NotificationsService) {}

  @MessagePattern({ cmd: 'create_notification' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateNotificationSchema))
  async create(
    @Payload() payload: { dto: CreateNotificationDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating notification for user: ${payload.dto.userId} by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.service.createNotification(payload.user, payload.dto);
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${payload.dto.userId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'get_my_notifications' })
  @UsePipes(new JoiValidationPipe(UserOnlyNotificationSchema))
  async myNotifications(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(
      `User ${payload.user.firebaseId} is fetching their notifications`,
    );
    try {
      return await this.service.getUserNotifications(payload.user);
    } catch (error) {
      this.logger.error(
        `User ${payload.user.firebaseId} failed to fetch their notifications: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'get_notification_by_id' })
  @UsePipes(new JoiValidationPipe(NotificationIdSchema))
  async getById(
    @Payload() payload: { id: number; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `User ${payload.user.firebaseId} fetching notification ${payload.id}`,
    );
    try {
      return await this.service.getNotificationById(payload.user, payload.id);
    } catch (error) {
      this.logger.error(
        `User ${payload.user.firebaseId} failed to fetch notification ${payload.id}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'mark_notification_read' })
  @UsePipes(new JoiValidationPipe(NotificationIdSchema))
  async markRead(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `User ${payload.user.firebaseId} marking notification ${payload.id} as read`,
    );
    try {
      return await this.service.markAsRead(payload.user, payload.id);
    } catch (error) {
      this.logger.error(
        `User ${payload.user.firebaseId} failed to mark notification ${payload.id} as read: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'delete_notification' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(NotificationIdSchema))
  async delete(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `User ${payload.user.firebaseId} deleting notification ${payload.id}`,
    );
    try {
      return await this.service.deleteNotification(payload.user, payload.id);
    } catch (error) {
      this.logger.error(
        `User ${payload.user.firebaseId} failed to delete notification ${payload.id}: ${error.message}`,
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
        `Internal: Failed to create progress notification for user ${payload.userId}: ${error.message}`,
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
      `Internal: Notifying instructors about student ${payload.studentId} progress in course ${payload.courseId}`,
    );
    try {
      return await this.service.notifyInstructorProgress(
        payload.studentId,
        payload.courseId,
        payload.moduleTitle,
      );
    } catch (error) {
      this.logger.error(
        `Internal: Failed to notify instructors about student ${payload.studentId} progress in course ${payload.courseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }
}
