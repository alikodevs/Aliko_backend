import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/client';
import { EmailService } from '../common/email.service';

@Injectable()
export class CmsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) { }

  // Webinar Registration
  async registerForWebinar(webinarId: string, data: { name: string; email: string }) {
    const { name, email } = data;
    const webinar = await this.prisma.webinar.findUnique({ where: { id: webinarId } });
    if (!webinar) {
      throw new NotFoundException('Webinar not found');
    }

    const registration = await this.prisma.webinarRegistration.create({
      data: {
        webinarId,
        name,
        email,
      },
    });

    // Send async confirmation email
    if (webinar.webinarUrl) {
      this.emailService.sendWebinarConfirmation(
        data.email,
        data.name,
        webinar.title,
        webinar.webinarUrl,
        webinar.scheduledAt,
      ).catch(err => {
        console.error('Failed to send webinar email:', err);
      });
    }

    return registration;
  }

  // Pages
  async createPage(data: Prisma.PageCreateInput) {
    return this.prisma.page.create({ data });
  }

  async findAllPages() {
    return this.prisma.page.findMany();
  }

  async findOnePage(id: string) {
    return this.prisma.page.findUnique({ where: { id } });
  }

  async findBySlug(slug: string) {
    return this.prisma.page.findUnique({ where: { slug } });
  }

  async updatePage(id: string, data: Prisma.PageUpdateInput) {
    return this.prisma.page.update({ where: { id }, data });
  }

  async removePage(id: string) {
    return this.prisma.page.delete({ where: { id } });
  }

  // Resources
  async createResource(data: any) {
    if (data.resourceType) data.resourceType = data.resourceType.toUpperCase();
    if (data.consultationType) data.consultationType = data.consultationType.toUpperCase();
    return this.prisma.resource.create({ data });
  }

  async findAllResources(type?: string) {
    const where =
      typeof type === 'string' && type.trim()
        ? { resourceType: type.trim().toUpperCase() as any }
        : {};
    return this.prisma.resource.findMany({ where });
  }

  async findOneResource(id: string) {
    return this.prisma.resource.findUnique({ where: { id } });
  }

  async updateResource(id: string, data: any) {
    if (data.resourceType) data.resourceType = data.resourceType.toUpperCase();
    if (data.consultationType) data.consultationType = data.consultationType.toUpperCase();
    return this.prisma.resource.update({ where: { id }, data });
  }

  async removeResource(id: string) {
    return this.prisma.resource.delete({ where: { id } });
  }

  // Webinars
  private formatWebinarData(data: any) {
    const formatted = { ...data };
    if (formatted.scheduledAt && typeof formatted.scheduledAt === 'string') {
      formatted.scheduledAt = new Date(formatted.scheduledAt);
    }
    return formatted;
  }

  async createWebinar(data: any) {
    const formattedData = this.formatWebinarData(data);
    return this.prisma.webinar.create({ data: formattedData });
  }

  async findAllWebinars() {
    return this.prisma.webinar.findMany();
  }

  async findOneWebinar(id: string) {
    return this.prisma.webinar.findUnique({ where: { id } });
  }

  async updateWebinar(id: string, data: any) {
    const formattedData = this.formatWebinarData(data);
    return this.prisma.webinar.update({ where: { id }, data: formattedData });
  }

  async removeWebinar(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.webinarRegistration.deleteMany({ where: { webinarId: id } });
      return tx.webinar.delete({ where: { id } });
    });
  }

  async findWebinarRegistrations(webinarId?: string) {
    const where = webinarId ? { webinarId } : {};
    return this.prisma.webinarRegistration.findMany({
      where,
      include: {
        webinar: {
          select: { id: true, title: true, slug: true, scheduledAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Testimonials
  private formatTestimonialData(data: any) {
    const formatted = { ...data };
    if (formatted.consultationType && typeof formatted.consultationType === 'string') {
      formatted.consultationType = formatted.consultationType.toUpperCase();
    }
    return formatted;
  }

  async createTestimonial(data: any) {
    const formattedData = this.formatTestimonialData(data);
    return this.prisma.testimonial.create({ data: formattedData });
  }

  async findAllTestimonials() {
    return this.prisma.testimonial.findMany();
  }

  async findOneTestimonial(id: string) {
    return this.prisma.testimonial.findUnique({ where: { id } });
  }

  async updateTestimonial(id: string, data: any) {
    const formattedData = this.formatTestimonialData(data);
    return this.prisma.testimonial.update({ where: { id }, data: formattedData });
  }

  async removeTestimonial(id: string) {
    return this.prisma.testimonial.delete({ where: { id } });
  }
}
