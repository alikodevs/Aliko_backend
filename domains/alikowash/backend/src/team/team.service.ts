import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
} from "./dto/team-member.dto";

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeamMemberDto) {
    this.logger.log(`Creating team member: ${dto.name}`);
    try {
      const result = await this.prisma.teamMember.create({
        data: dto,
      });
      this.logger.log(`Successfully created team member: ${dto.name} (ID: ${result.id})`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to create team member ${dto.name}: ${error.message}`);
      throw error;
    }
  }

  async findAll(query: any) {
    const { isPublished, limit = 50, offset = 0 } = query;
    const results = await this.prisma.teamMember.findMany({
      where: {
        ...(isPublished !== undefined
          ? { isPublished: isPublished === "true" }
          : {}),
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { displayOrder: "asc" },
    });
    this.logger.log(`Found ${results.length} team members`);
    return results;
  }

  async findOne(id: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { id },
    });
    if (!member) {
      this.logger.warn(`Team member with ID ${id} not found`);
      throw new NotFoundException(`Team member with ID ${id} not found`);
    }
    return member;
  }

  async update(id: string, dto: UpdateTeamMemberDto) {
    this.logger.log(`Updating team member ID: ${id}`);
    try {
      const result = await this.prisma.teamMember.update({
        where: { id },
        data: dto,
      });
      this.logger.log(`Successfully updated team member ID: ${id}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to update team member. ID ${id} not found`);
        throw new NotFoundException(`Team member with ID ${id} not found`);
      }
      this.logger.error(`Error updating team member ID ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string) {
    this.logger.log(`Deleting team member ID: ${id}`);
    try {
      const result = await this.prisma.teamMember.delete({
        where: { id },
      });
      this.logger.log(`Successfully deleted team member ID: ${id}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to delete team member. ID ${id} not found`);
        throw new NotFoundException(`Team member with ID ${id} not found`);
      }
      this.logger.error(`Error deleting team member ID ${id}: ${error.message}`);
      throw error;
    }
  }
}
