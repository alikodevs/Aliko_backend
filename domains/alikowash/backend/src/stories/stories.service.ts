import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateStoryChapterDto,
  UpdateStoryChapterDto,
} from "./dto/story-chapter.dto";

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStoryChapterDto) {
    this.logger.log(`Creating story chapter: ${dto.projectName || "Untitled"}`);
    try {
      const result = await this.prisma.storyChapter.create({
        data: dto,
      });
      this.logger.log(`Successfully created story chapter ID: ${result.id}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to create story chapter: ${error.message}`);
      throw error;
    }
  }

  async findAll(query: any) {
    const { isPublished, limit = 20, offset = 0 } = query;
    const results = await this.prisma.storyChapter.findMany({
      where: {
        ...(isPublished !== undefined
          ? { isPublished: isPublished === "true" }
          : {}),
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { orderIndex: "asc" },
    });
    this.logger.log(`Found ${results.length} story chapters`);
    return results;
  }

  async findOne(id: string) {
    const story = await this.prisma.storyChapter.findUnique({
      where: { id },
    });
    if (!story) {
      this.logger.warn(`Story chapter with ID ${id} not found`);
      throw new NotFoundException(`Story chapter with ID ${id} not found`);
    }
    return story;
  }

  async update(id: string, dto: UpdateStoryChapterDto) {
    this.logger.log(`Updating story chapter ID: ${id}`);
    try {
      const result = await this.prisma.storyChapter.update({
        where: { id },
        data: dto,
      });
      this.logger.log(`Successfully updated story chapter ID: ${id}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to update story chapter. ID ${id} not found`);
        throw new NotFoundException(`Story chapter with ID ${id} not found`);
      }
      this.logger.error(`Error updating story chapter ID ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string) {
    this.logger.log(`Deleting story chapter ID: ${id}`);
    try {
      const result = await this.prisma.storyChapter.delete({
        where: { id },
      });
      this.logger.log(`Successfully deleted story chapter ID: ${id}`);
      return result;
    } catch (error: any) {
      if (error.code === "P2025") {
        this.logger.warn(`Failed to delete story chapter. ID ${id} not found`);
        throw new NotFoundException(`Story chapter with ID ${id} not found`);
      }
      this.logger.error(`Error deleting story chapter ID ${id}: ${error.message}`);
      throw error;
    }
  }
}
