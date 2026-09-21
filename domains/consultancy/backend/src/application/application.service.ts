import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ApplicationStatus } from '../generated/client';
import { generateUniqueCode } from '../common/utils/code-generator.util';

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    const formatted = { ...data };
    if (!formatted.userId) {
      delete formatted.userId;
    }
    if (formatted.status && typeof formatted.status === 'string') {
      formatted.status = formatted.status.toUpperCase();
    }
    if (formatted.consultationType && typeof formatted.consultationType === 'string') {
      formatted.consultationType = formatted.consultationType.toUpperCase();
    }
    const applicationCode = await generateUniqueCode(
      this.prisma,
      this.prisma.application,
      'applicationCode',
      'APP-ALC-',
    );

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: { ...formatted, applicationCode },
      });

      await tx.applicationStatusLog.create({
        data: {
          applicationId: application.id,
          newStatus: application.status,
          notes: 'Initial submission',
        },
      });

      return application;
    });
  }

  async findAll() {
    return this.prisma.application.findMany({
      include: { logs: true, documents: true },
    });
  }

  async findOne(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { logs: true, documents: true },
    });
    if (!application)
      throw new NotFoundException(`Application ${id} not found`);
    return application;
  }

  async findByUserId(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      include: { logs: true, documents: true },
    });
  }

  async findByCode(applicationCode: string) {
    const application = await this.prisma.application.findUnique({
      where: { applicationCode },
      include: { logs: true },
    });
    if (!application)
      throw new NotFoundException(`Application with code ${applicationCode} not found`);
    return application;
  }

  async updateStatus(
    id: string,
    newStatus: any,
    notes?: string,
    changedBy?: string,
  ) {
    const normalizedStatus = typeof newStatus === 'string' ? newStatus.toUpperCase() : newStatus;
    
    return this.prisma.$transaction(async (tx) => {
      const oldApp = await tx.application.findUnique({ where: { id } });
      if (!oldApp) throw new NotFoundException(`Application ${id} not found`);

      const updatedApp = await tx.application.update({
        where: { id },
        data: { status: normalizedStatus },
      });

      await tx.applicationStatusLog.create({
        data: {
          applicationId: id,
          oldStatus: oldApp.status,
          newStatus: normalizedStatus,
          notes,
          changedBy,
        },
      });

      return updatedApp;
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    if (data.status) data.status = data.status.toUpperCase();
    if (data.consultationType) data.consultationType = data.consultationType.toUpperCase();
    return this.prisma.application.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.application.delete({ where: { id } });
  }

  // --- Document CRUD ---
  async addDocument(data: Prisma.ApplicationDocumentCreateInput) {
    return this.prisma.applicationDocument.create({ data });
  }

  async findDocuments(applicationId: string) {
    return this.prisma.applicationDocument.findMany({
      where: { applicationId },
    });
  }

  async removeDocument(id: string) {
    return this.prisma.applicationDocument.delete({ where: { id } });
  }
}
