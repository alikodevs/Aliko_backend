import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { Prisma } from '../generated/client';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  resolvePayload,
  resolveParam,
} from '../common/utils/payload-resolver.util';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @MessagePattern({ cmd: 'create_booking' })
  @Post()
  create(
    @Body() data: Omit<Prisma.BookingCreateInput, 'bookingCode'>,
    @Payload() payload: any,
  ) {
    const resolvedData = resolvePayload(data, payload);
    return this.bookingService.create(resolvedData);
  }

  @MessagePattern({ cmd: 'get_all_bookings' })
  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @MessagePattern({ cmd: 'get_user_bookings' })
  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Payload() payload: { userId: string },
  ) {
    const targetId = resolveParam(userId, payload?.userId);
    return this.bookingService.findByUser(targetId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_booking' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: Prisma.BookingUpdateInput,
    @Payload() payload: any,
  ) {
    const targetId = resolveParam(id, payload?.id);
    const resolvedData = resolvePayload(data, payload?.data || payload);
    const { id: ignoredId, ...updateFields } = resolvedData || {};
    return this.bookingService.update(targetId, updateFields);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(id);
  }
}
