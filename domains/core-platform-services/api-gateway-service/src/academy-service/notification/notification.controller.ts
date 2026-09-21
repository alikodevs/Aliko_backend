import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('academy/notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(@Inject('ACADEMY_SERVICE') private academyClient: ClientProxy) {}

  // Admin / Instructor (system-generated)
  @Post()
  @ApiOperation({
    summary: 'Create a notification',
    description: '🔒 Admin / Instructor only',
  })
  @ApiResponse({ status: 201, description: 'Notification created' })
  @ApiBody({ type: CreateNotificationDto })
  createNotification(
    @Request() req: RequestWithUser,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    const payload = {
      dto: createNotificationDto,
      user: req.user,
    };
    return this.academyClient.send({ cmd: 'create_notification' }, payload);
  }

  // Authenticated user
  @Get('me')
  @ApiOperation({
    summary: 'Get my notifications',
  })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  myNotifications(@Request() req: RequestWithUser) {
    const payload = { user: req.user };
    return this.academyClient.send({ cmd: 'get_my_notifications' }, payload);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get notification detail by id',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Notification detail' })
  getNotificationById(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const payload = { id, user: req.user };
    return this.academyClient.send({ cmd: 'get_notification_by_id' }, payload);
  }

  // Authenticated user
  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
  })
  @ApiParam({ name: 'id', type: Number })
  markNotificationRead(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    const payload = { id, user: req.user };
    return this.academyClient.send({ cmd: 'mark_notification_read' }, payload);
  }

  // Authenticated user
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a notification',
  })
  @ApiParam({ name: 'id', type: Number })
  deleteNotification(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    const payload = { id, user: req.user };
    return this.academyClient.send({ cmd: 'delete_notification' }, payload);
  }

  // Get my notifications
  @Get('my')
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiResponse({ status: 200, description: 'List of user notifications' })
  getMyNotifications(@Request() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const payload = { userId: req.user.firebaseId, user: req.user };
    return this.academyClient.send({ cmd: 'get_my_notifications' }, payload);
  }
}
