import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/client';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  // AvailabilityRule CRUD
  private formatRuleData(data: any) {
    const formatted = { ...data };
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
    if (formatted.dayOfWeek !== undefined) {
      formatted.dayOfWeek = Number(formatted.dayOfWeek);
    }
    if (formatted.slotDurationMinutes !== undefined) {
      formatted.slotDurationMinutes = Number(formatted.slotDurationMinutes);
    }
    if (formatted.bufferMinutes !== undefined) {
      formatted.bufferMinutes = Number(formatted.bufferMinutes);
    }
    return formatted;
  }

  async createRule(data: any) {
    const formattedData = this.formatRuleData(data);
    return this.prisma.availabilityRule.create({ data: formattedData });
  }

  async findAllRules() {
    return this.prisma.availabilityRule.findMany();
  }

  async findOneRule(id: string) {
    return this.prisma.availabilityRule.findUnique({ where: { id } });
  }

  async updateRule(id: string, data: any) {
    const formattedData = this.formatRuleData(data);
    return this.prisma.availabilityRule.update({ where: { id }, data: formattedData });
  }

  async removeRule(id: string) {
    return this.prisma.availabilityRule.delete({ where: { id } });
  }

  // TimeBlock CRUD
  private formatTimeBlockData(data: any) {
    const formatted = { ...data };
    if (formatted.startDatetime && typeof formatted.startDatetime === 'string') {
      formatted.startDatetime = new Date(formatted.startDatetime);
    }
    if (formatted.endDatetime && typeof formatted.endDatetime === 'string') {
      formatted.endDatetime = new Date(formatted.endDatetime);
    }
    return formatted;
  }

  async createTimeBlock(data: any) {
    const formatted = this.formatTimeBlockData(data);
    return this.prisma.timeBlock.create({ data: formatted });
  }

  async findAllTimeBlocks() {
    return this.prisma.timeBlock.findMany();
  }

  async findOneTimeBlock(id: string) {
    return this.prisma.timeBlock.findUnique({ where: { id } });
  }

  async updateTimeBlock(id: string, data: any) {
    const formatted = this.formatTimeBlockData(data);
    return this.prisma.timeBlock.update({ where: { id }, data: formatted });
  }

  async removeTimeBlock(id: string) {
    return this.prisma.timeBlock.delete({ where: { id } });
  }
}
