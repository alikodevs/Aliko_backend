import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePartnerDto } from "./dto/create-partner.dto";
import { UpdatePartnerDto } from "./dto/update-partner.dto";

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePartnerDto) {
    this.logger.log(`Creating partner: ${dto.orgName}`);
    try {
      const result = await this.prisma.partner.create({
        data: dto,
      });
      this.logger.log(`Successfully created partner: ${dto.orgName} (ID: ${result.id})`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to create partner ${dto.orgName}: ${error.message}`);
      throw error;
    }
  }

  async findAll(query: any) {
    const { isPublished, limit = 10, offset = 0 } = query;
    const results = await this.prisma.partner.findMany({
      where: {
        ...(isPublished !== undefined
          ? { isPublished: isPublished === "true" }
          : {}),
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { displayOrder: "asc" },
    });
    this.logger.log(`Found ${results.length} partners`);
    return results;
  }

  async findOne(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
    });
    if (!partner) {
      this.logger.warn(`Partner with ID ${id} not found`);
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }
    return partner;
  }

  async update(id: string, dto: UpdatePartnerDto) {
    this.logger.log(`Updating partner ID: ${id}`);
    try {
      const result = await this.prisma.partner.update({
        where: { id },
        data: dto,
      });
      this.logger.log(`Successfully updated partner ID: ${id}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to update partner. ID ${id} not found`);
        throw new NotFoundException(`Partner with ID ${id} not found`);
      }
      this.logger.error(`Error updating partner ID ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string) {
    this.logger.log(`Deleting partner ID: ${id}`);
    try {
      const result = await this.prisma.partner.delete({
        where: { id },
      });
      this.logger.log(`Successfully deleted partner ID: ${id}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to delete partner. ID ${id} not found`);
        throw new NotFoundException(`Partner with ID ${id} not found`);
      }
      this.logger.error(`Error deleting partner ID ${id}: ${error.message}`);
      throw error;
    }
  }
}
