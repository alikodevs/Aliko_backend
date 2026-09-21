import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateSiteSettingDto,
  UpdateSiteSettingDto,
} from "./dto/site-setting.dto";

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsert(dto: CreateSiteSettingDto) {
    this.logger.log(`Upserting site setting for key: ${dto.key}`);
    try {
      return await this.prisma.siteSetting.upsert({
        where: { key: dto.key },
        update: { value: dto.value },
        create: { key: dto.key, value: dto.value },
      });
    } catch (error: any) {
      this.logger.error(`Failed to upsert site setting: ${error.message}`);
      throw error;
    }
  }

  async findAll() {
    return await this.prisma.siteSetting.findMany();
  }

  async findByKey(key: string) {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key },
    });
    if (!setting)
      throw new NotFoundException(`Site setting with key "${key}" not found`);
    return setting;
  }

  async remove(key: string) {
    try {
      return await this.prisma.siteSetting.delete({
        where: { key },
      });
    } catch (error: any) {
      if (error.code === "P2025")
        throw new NotFoundException(`Site setting with key "${key}" not found`);
      throw error;
    }
  }
}
