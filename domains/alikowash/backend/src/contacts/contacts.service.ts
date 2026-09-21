import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { subHours } from "date-fns";
import { EmailService } from "../common/email.service";

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateContactDto) {
    this.logger.log(`Handling contact submission from email: ${dto.email}`);

    // Rate Limiting Logic: Max 5 submissions per hour per email
    const oneHourAgo = subHours(new Date(), 1);
    const recentSubmissionsCount = await this.prisma.contact.count({
      where: {
        email: dto.email,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (recentSubmissionsCount >= 5) {
      this.logger.warn(`Rate limit exceeded for contact email: ${dto.email}`);
      throw new BadRequestException(
        "Too many requests. Please try again later.",
      );
    }

    try {
      const contact = await this.prisma.contact.create({
        data: dto,
      });

      // SMTP Notifications
      // 1. Send confirmation to user
      this.emailService
        .sendContactConfirmation(dto.email, dto.name)
        .catch((err) => {
          this.logger.error(
            `Failed to send contact confirmation: ${err.message}`,
          );
        });

      // 2. Send notification to admin
      this.emailService.sendAdminContactNotification(dto).catch((err) => {
        this.logger.error(
          `Failed to send admin contact notification: ${err.message}`,
        );
      });

      this.logger.log(`Successfully submitted contact request for email: ${dto.email}`);
      return contact;
    } catch (error: any) {
      this.logger.error(`Failed to create contact record: ${error.message}`);
      throw error;
    }
  }

  async findAll(query: any) {
    const { limit = 50, offset = 0 } = query;
    const results = await this.prisma.contact.findMany({
      take: Number(limit),
      skip: Number(offset),
      orderBy: { createdAt: "desc" },
    });
    this.logger.log(`Found ${results.length} contact records`);
    return results;
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });
    if (!contact) {
      this.logger.warn(`Contact record with ID ${id} not found`);
      throw new NotFoundException(`Contact record with ID ${id} not found`);
    }
    return contact;
  }

  async markAsRead(id: string) {
    try {
      const result = await this.prisma.contact.update({
        where: { id },
        data: { isRead: true },
      });
      this.logger.log(`Successfully marked contact ID: ${id} as read`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to mark contact read. ID ${id} not found`);
        throw new NotFoundException(`Contact record with ID ${id} not found`);
      }
      this.logger.error(`Error marking contact read ID ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const result = await this.prisma.contact.delete({
        where: { id },
      });
      this.logger.log(`Successfully deleted contact record ID: ${id}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to delete contact. ID ${id} not found`);
        throw new NotFoundException(`Contact record with ID ${id} not found`);
      }
      this.logger.error(`Error deleting contact record ID ${id}: ${error.message}`);
      throw error;
    }
  }
}
