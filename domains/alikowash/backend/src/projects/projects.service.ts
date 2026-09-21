import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    this.logger.log(`Creating project: ${dto.title}`);
    try {
      const result = await this.prisma.project.create({
        data: {
          ...dto,
        },
      });
      this.logger.log(`Successfully created project: ${dto.title}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to create project: ${dto.title}. Error: ${error.message}`);
      throw error;
    }
  }

  async findAll(query: any) {
    const { isPublished, limit = 10, offset = 0 } = query;
    const results = await this.prisma.project.findMany({
      where: {
        ...(isPublished !== undefined
          ? { isPublished: isPublished === "true" }
          : {}),
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { displayOrder: "asc" },
    });
    this.logger.log(`Found ${results.length} projects`);
    return results;
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });
    if (!project) {
      this.logger.warn(`Project with ID ${id} not found`);
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    try {
      const result = await this.prisma.project.update({
        where: { id },
        data: dto,
      });
      this.logger.log(`Successfully updated project ID: ${id}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to update project. ID ${id} not found`);
        throw new NotFoundException(`Project with ID ${id} not found`);
      }
      this.logger.error(`Error updating project ID ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const result = await this.prisma.project.delete({
        where: { id },
      });
      this.logger.log(`Successfully deleted project ID: ${id}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to delete project. ID ${id} not found`);
        throw new NotFoundException(`Project with ID ${id} not found`);
      }
      this.logger.error(`Error deleting project ID ${id}: ${error.message}`);
      throw error;
    }
  }
}
