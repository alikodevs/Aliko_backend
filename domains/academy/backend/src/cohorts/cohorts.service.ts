import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CreateCohortDto } from './dto/create-cohort.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { PushNotificationService } from '@alikohub/notification';

@Injectable()
export class CohortsService {
  private readonly logger = new Logger(CohortsService.name);
  private readonly notificationService = new PushNotificationService();

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(dto: CreateCohortDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (
      course.instructorId !== user.firebaseId &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'You do not have permission to create a cohort for this course.',
      );
    }

    const cohort = await this.prisma.cohort.create({ data: dto });

    this.notificationService.sendCohortCreatedNotification(
      cohort.name,
      course.title,
      String(cohort.id),
      String(course.id),
    ).catch(err => this.logger.error('Failed to send cohort push notification:', err));

    return cohort;
  }

  async findAll(query: any = {}) {
    const where: any = {};
    if (query.courseId) where.courseId = Number(query.courseId);

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.cohort.findMany({
        where,
        skip,
        take: pageSize,
        include: { course: { select: { id: true, title: true } } },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.cohort.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByInstructor(user: AuthenticatedUser, query: any = {}) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException('Instructor role required');
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const where: any = {
      course: {
        instructorId: user.firebaseId,
      },
    };

    if (query.courseId) where.courseId = Number(query.courseId);

    const [items, total] = await Promise.all([
      this.prisma.cohort.findMany({
        where,
        skip,
        take: pageSize,
        include: { course: { select: { id: true, title: true } } },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.cohort.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const cohort = await this.prisma.cohort.findUnique({ where: { id } });
    if (!cohort) throw new NotFoundException('Cohort not found');
    return cohort;
  }

  async update(
    id: number,
    dto: Partial<CreateCohortDto>,
    user: AuthenticatedUser,
  ) {
    // Find the cohort and its parent course for the ownership check
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const cohort = await this.prisma.cohort.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    if (
      cohort.course.instructorId !== user.firebaseId &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this cohort.',
      );
    }

    return await this.prisma.cohort.update({ where: { id }, data: dto });
  }

  async remove(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const cohort = await this.prisma.cohort.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    if (
      cohort.course.instructorId !== user.firebaseId &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this cohort.',
      );
    }

    return await this.prisma.cohort.delete({ where: { id } });
  }
}
