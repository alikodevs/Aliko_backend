import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateUniqueCode } from '../common/utils/code-generator.util';
import { EmailService } from '../common/email.service';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private formatBookingData(data: any) {
    const formatted = { ...data };

    if (formatted.bookingDate) {
      formatted.bookingDate = new Date(formatted.bookingDate);
    }
    if (typeof formatted.startTime === 'string') {
      formatted.startTime = new Date(
        formatted.startTime.includes('T')
          ? formatted.startTime
          : `1970-01-01T${formatted.startTime}Z`,
      );
    }
    if (typeof formatted.endTime === 'string') {
      formatted.endTime = new Date(
        formatted.endTime.includes('T')
          ? formatted.endTime
          : `1970-01-01T${formatted.endTime}Z`,
      );
    }
    if (formatted.consultationType && typeof formatted.consultationType === 'string') {
      formatted.consultationType = formatted.consultationType.toUpperCase();
    }
    if (formatted.status && typeof formatted.status === 'string') {
      formatted.status = formatted.status.toUpperCase();
    }
    if (!formatted.userId) {
      delete formatted.userId;
    }
    return formatted;
  }

  async create(data: any) {
    const bookingCode = await generateUniqueCode(
      this.prisma,
      this.prisma.booking,
      'bookingCode',
      'BK-ALC-',
    );
    const formattedData = this.formatBookingData(data);
    const booking = await this.prisma.booking.create({
      data: { ...formattedData, bookingCode },
    });

    // Send confirmation email
    this.emailService.sendBookingConfirmation(booking)
      .catch(err => console.error('Failed to send booking confirmation email:', err));

    return booking;
  }

  async findAll() {
    return this.prisma.booking.findMany();
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking;
  }

  async findByUser(userId: string) {
    return this.prisma.booking.findMany({ where: { userId } });
  }

  async update(id: string, data: any) {
    await this.findOne(id); // Ensure it exists
    const formattedData = this.formatBookingData(data);
    return this.prisma.booking.update({ where: { id }, data: formattedData });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.booking.delete({ where: { id } });
  }
}
