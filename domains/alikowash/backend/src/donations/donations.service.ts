import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateDonationDto,
  UpdateDonationDto,
} from "./dto/create-donation.dto";
import { subHours } from "date-fns";

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDonationDto) {
    this.logger.log(`Handling donation request from email: ${dto.email}`);

    // Rate Limiting Logic: Max 10 requests per hour per email
    const oneHourAgo = subHours(new Date(), 1);
    const recentRequestsCount = await this.prisma.donation.count({
      where: {
        email: dto.email,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (recentRequestsCount >= 10) {
      this.logger.warn(`Rate limit exceeded for donation email: ${dto.email}`);
      throw new BadRequestException(
        "Rate limit exceeded. Please try again after an hour.",
      );
    }

    try {
      const result = await this.prisma.donation.create({
        data: dto,
      });
      this.logger.log(`Successfully created donation record for: ${dto.email}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to handle donation request from ${dto.email}: ${error.message}`);
      throw error;
    }
  }

  async findAll(query: any) {
    const { limit = 50, offset = 0, status } = query;
    const results = await this.prisma.donation.findMany({
      where: {
        ...(status ? { status } : {}),
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { createdAt: "desc" },
    });
    this.logger.log(`Found ${results.length} donation records`);
    return results;
  }

  async findOne(id: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
    });
    if (!donation) {
      this.logger.warn(`Donation record with ID ${id} not found`);
      throw new NotFoundException(`Donation record with ID ${id} not found`);
    }
    return donation;
  }

  async updateStatus(id: string, status: string) {
    try {
      const result = await this.prisma.donation.update({
        where: { id },
        data: { status },
      });
      this.logger.log(`Successfully updated donation ID: ${id} status to: ${status}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to update donation. ID ${id} not found`);
        throw new NotFoundException(`Donation record with ID ${id} not found`);
      }
      this.logger.error(`Error updating donation ID ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const result = await this.prisma.donation.delete({
        where: { id },
      });
      this.logger.log(`Successfully deleted donation ID: ${id}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to delete donation record. ID ${id} not found`);
        throw new NotFoundException(`Donation record with ID ${id} not found`);
      }
      this.logger.error(`Error deleting donation record ID ${id}: ${error.message}`);
      throw error;
    }
  }
}
