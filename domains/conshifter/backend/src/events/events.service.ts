import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { Event, EventType } from '../generated/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async findAll() {
    const events = await this.prisma.event.findMany({
      orderBy: { startDate: 'asc' },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    });
    this.logger.log(`Found ${events.length} events`);
    return events;
  }

  async findUpcoming() {
    return this.prisma.event.findMany({
      where: {
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: 'asc' },
      take: 6,
    });
  }

  async findOne(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
    });
    if (!event) {
      this.logger.warn(`Event with slug ${slug} not found`);
      throw new RpcException('Event not found');
    }
    return event;
  }

  async create(data: any) {
    try {
      const result = await this.prisma.event.create({
        data,
      });
      this.logger.log(`Successfully created event: ${data.title || result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create event: ${error.message}`);
      throw new RpcException('Failed to create event');
    }
  }

  async update(id: string, data: any) {
    try {
      const result = await this.prisma.event.update({
        where: { id },
        data,
      });
      this.logger.log(`Successfully updated event ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update event ${id}: ${error.message}`);
      throw new RpcException('Failed to update event');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.event.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete event ${id}: ${error.message}`);
      throw new RpcException('Failed to delete event');
    }
  }

  async registerForEvent(slug: string, data: { name: string; email: string; company?: string; role?: string }) {
    try {
      const event = await this.findOne(slug);

      const registration = await this.prisma.eventRegistration.create({
        data: {
          eventId: event.id,
          name: data.name,
          email: data.email,
          company: data.company,
          role: data.role,
        },
      });

      this.logger.log(`User ${data.email} registered for event ${event.title}`);

      // Send email confirmation
      await this.mailService.sendRegistrationConfirmation(data.email, {
        name: data.name,
        eventTitle: event.title,
        webinarLink: event.isVirtual ? (event.virtualLink ?? undefined) : undefined,
      });

      return registration;
    } catch (error) {
      this.logger.error(`Failed to register for event: ${error.message}`);
      if (error instanceof RpcException) throw error;
      throw new RpcException('Failed to register for event');
    }
  }

  async getAttendees(eventId: string) {
    try {
      return await this.prisma.eventRegistration.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch attendees for event ${eventId}: ${error.message}`);
      throw new RpcException('Failed to fetch attendees');
    }
  }
}
