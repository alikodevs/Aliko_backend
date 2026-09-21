import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ApplicationStatus, OrganizationStatus } from '../generated/client';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getCounts() {
    this.logger.log('Fetching dashboard counts');
    const [
      events,
      organizations,
      programs,
      partners,
      applications,
      subscribers,
    ] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.organization.count(),
      this.prisma.program.count(),
      this.prisma.partner.count(),
      this.prisma.membershipApplication.count(),
      this.prisma.newsletterSubscriber.count(),
    ]);

    this.logger.log(`Dashboard counts fetched: Events=${events}, Orgs=${organizations}, Programs=${programs}`);

    return {
      events,
      organizations,
      programs,
      partners,
      applications,
      subscribers,
    };
  }
}
