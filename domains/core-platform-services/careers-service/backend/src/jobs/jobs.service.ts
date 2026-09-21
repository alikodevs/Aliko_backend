import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async createJob(data: any, userId: string) {
    this.logger.log(`Creating job: ${data.title} by user: ${userId}`);
    
    return this.prisma.job.create({
      data: {
        ...data,
        postedBy: userId,
      },
    });
  }

  async findAllJobs(filters: any = {}) {
    const { 
      workMode, 
      employmentType, 
      level, 
      category, 
      ventureId, 
      companyId,
      region,
      search,
      sort
    } = filters;

    const where: any = { status: 'OPEN' };

    if (workMode) where.workMode = workMode;
    if (employmentType) where.employmentType = employmentType;
    if (level) where.level = level;
    if (category) where.category = category;
    if (ventureId) where.ventureId = ventureId;
    if (companyId) where.companyId = companyId;
    if (region) where.region = region;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ventureName: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'salary') {
      orderBy = { salaryMax: 'desc' };
    }

    return this.prisma.job.findMany({
      where,
      orderBy,
      include: {
        venture: true,
        company: true,
      },
    });
  }

  async findOneJob(id: number) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        applications: true,
        venture: true,
        company: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  async updateJob(id: number, data: any, userId: string, isAdmin: boolean = false) {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
       throw new NotFoundException(`Job with ID ${id} not found`);
    }
    
    if (!isAdmin && job.postedBy !== userId) {
      this.logger.warn(`User ${userId} attempted to update job ${id} without permission`);
      throw new ForbiddenException('You do not have permission to update this job');
    }

    return this.prisma.job.update({
      where: { id },
      data,
    });
  }

  async deleteJob(id: number, userId: string, isAdmin: boolean = false) {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
       throw new NotFoundException(`Job with ID ${id} not found`);
    }

    if (!isAdmin && job.postedBy !== userId) {
       this.logger.warn(`User ${userId} attempted to delete job ${id} without permission`);
       throw new ForbiddenException('You do not have permission to delete this job');
    }

    return this.prisma.job.delete({
      where: { id },
    });
  }

  async applyToJob(jobId: number, user: any, applicationData: any) {
    const userId = user.firebaseId;
    
    const fullName = applicationData.fullName || (user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : user.firstname || '');
    const email = applicationData.email || user.email || '';

    if (!fullName || !email) {
      throw new ForbiddenException('Full name and email are required.');
    }

    const existingApplication = await this.prisma.jobApplication.findUnique({
      where: {
        userId_jobId: {
          userId: userId,
          jobId: jobId
        }
      }
    });

    if (existingApplication) {
      throw new ForbiddenException('You have already applied for this job.');
    }

    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'OPEN') {
      throw new NotFoundException(`Job with ID ${jobId} is not available`);
    }

    // Using resumeUrl/phone from applicationData, or fallback to properties provided in user object (careersUser)
    return this.prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        fullName,
        email,
        phone: applicationData.phone || user.phone,
        coverLetter: applicationData.coverLetter,
        resumeUrl: applicationData.resumeUrl || user.careersUser?.resumeUrl || '',
        salaryExpectation: applicationData.salaryExpectation,
        salaryCurrency: applicationData.salaryCurrency || 'USD',
        salaryNegotiable: applicationData.salaryNegotiable,
        startDate: applicationData.startDate,
        workAuthorized: applicationData.workAuthorized,
        location: applicationData.location || user.location,
        linkedInUrl: applicationData.linkedInUrl || user.linkedInUrl,
        portfolioUrl: applicationData.portfolioUrl || user.portfolioUrl,
        yearsOfExperience: applicationData.yearsOfExperience || user.yearsOfExperience,
        skills: applicationData.skills || user.skills || [],
        notes: applicationData.notes,
      },
    });
  }

  async getApplicationsForJob(jobId: number) {
    return this.prisma.jobApplication.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
