import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStatus } from '../generated/client';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    jobId: number;
    userId: string;
    fullName: string;
    email: string;
    phone?: string;
    coverLetter?: string;
    resumeUrl: string;
    salaryExpectation?: number;
    salaryCurrency?: string;
    salaryNegotiable?: boolean;
    startDate?: string;
    workAuthorized?: boolean;
    location?: string;
    linkedInUrl?: string;
    portfolioUrl?: string;
    yearsOfExperience?: number;
    skills?: string[];
  }) {
    return this.prisma.jobApplication.create({
      data: {
        ...data,
        status: ApplicationStatus.SUBMITTED,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.jobApplication.findMany({
      where: { userId },
      include: {
        job: {
          select: {
            title: true,
            ventureName: true,
            company: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.jobApplication.findUnique({
      where: { id },
      include: { job: true },
    });
  }

  async updateStatus(id: number, status: ApplicationStatus, adminNotes?: string) {
    return this.prisma.jobApplication.update({
      where: { id },
      data: { status, adminNotes },
    });
  }

  async findAll() {
    return this.prisma.jobApplication.findMany({
      include: { job: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
