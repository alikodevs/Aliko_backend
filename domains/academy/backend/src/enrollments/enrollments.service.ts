import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { CourseStatus, EnrollmentStatus, PaymentStatus, EnrollmentContext } from '../generated/client';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  async create(dto: CreateEnrollmentDto, user: AuthenticatedUser, clientIp?: string, clientCountry?: string) {
    this.logger.log(`Creating enrollment. DTO: ${JSON.stringify(dto)}, User: ${JSON.stringify(user)} [IP: ${clientIp || 'N/A'}]`);

    // Manual validation
    if (!dto.courseId) {
      throw new BadRequestException('Course ID is required');
    }

    const academyProfile = await this.userService.getOrCreateProfile(user);
    
    let userIdToEnroll: string;
    if (dto.userId) {
      if (academyProfile.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can enroll other users.');
      }
      userIdToEnroll = dto.userId;
    } else {
      userIdToEnroll = user.firebaseId;
    }

    // Ensure user has an academy profile
    const userProfile = await this.userService.ensureProfileExists(userIdToEnroll);
    if (!userProfile) {
      throw new BadRequestException(`User with ID ${userIdToEnroll} does not exist or could not be synchronized.`);
    }

    // Validate that the course exists and is published
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new BadRequestException(`Course with ID ${dto.courseId} does not exist.`);
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException(`Course with ID ${dto.courseId} is not published.`);
    }

    const cohortId = dto.cohortId;
    if (cohortId !== undefined && cohortId !== null) {
        const cohort = await this.prisma.cohort.findUnique({
            where: { id: cohortId },
        });

        if (!cohort) {
            throw new BadRequestException(`Cohort with ID ${cohortId} does not exist.`);
        }

        if (cohort.courseId !== dto.courseId) {
            throw new BadRequestException(`Cohort ${cohortId} is not associated with course ${dto.courseId}.`);
        }
    }

    const isPaid = course.price && course.price > 0;
    this.logger.log(`Course ${course.id} is ${isPaid ? 'PAID' : 'FREE'}. Price: ${course.price}`);

    const enrollmentType = isPaid ? 'PAID' : 'FREE';
    const paymentStatus = isPaid ? 'PENDING' : 'COMPLETED';
    const enrollmentStatus = isPaid ? 'PENDING' : 'ACTIVE';

    // 1. Check for existing enrollment
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: userIdToEnroll,
        courseId: dto.courseId,
        cohortId: cohortId || null,
      },
    });

    if (existingEnrollment) {
      this.logger.log(`Existing enrollment found for user ${userIdToEnroll} in course ${dto.courseId}. Status: ${existingEnrollment.status}, Payment: ${existingEnrollment.paymentStatus}`);
      if (
        existingEnrollment.status === EnrollmentStatus.ACTIVE ||
        existingEnrollment.paymentStatus === PaymentStatus.COMPLETED
      ) {
        throw new ConflictException('User already enrolled and paid for this course');
      }
        
        // Update existing pending/failed enrollment
        await this.prisma.enrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            paymentStatus,
            status: enrollmentStatus as any,
          },
        });
    } else {
        // Create new enrollment
        await this.prisma.enrollment.create({
          data: {
            userId: userIdToEnroll,
            cohortId: cohortId || null,
            courseId: dto.courseId,
            enrollmentType: enrollmentType as any,
            paymentStatus,
            status: enrollmentStatus as any,
            context: cohortId ? EnrollmentContext.COHORT_BASED : EnrollmentContext.COURSE_ONLY,
          },
        });
    }

    // Need the enrollment object for metadata (especially the ID)
    const activeEnrollment = await this.prisma.enrollment.findFirst({
        where: {
            userId: userIdToEnroll,
            courseId: dto.courseId,
            cohortId: cohortId || null,
        }
    });

    // 3. Handle Payment Initialization
    if (isPaid) {
      try {
        // Fetch user details for payment gateway (email is required)
        const userDetails = await this.userService.getUserById(userIdToEnroll);

        const requestedProvider = (dto.paymentGateway && dto.paymentGateway !== 'auto') ? dto.paymentGateway.toUpperCase() : undefined;

        // Resolve provider & currency (checking IP location when not explicitly
        // requested) *before* picking the amount, so the amount always matches
        // the currency that will actually be charged.
        const geoConfig = await lastValueFrom(
          this.paymentClient.send({ cmd: 'resolve_payment_config' }, {
            clientIp,
            clientCountry,
            provider: requestedProvider,
          })
        );
        const provider = geoConfig.provider;
        const currency = geoConfig.currency;
        const amount = currency === 'USD' ? (course.priceInUsd || course.price) : course.price;

        const paymentSession = await lastValueFrom(
          this.paymentClient.send({ cmd: 'initialize_payment' }, {
            amount,
            currency,
            email: userDetails?.email || user.email || '',
            firstName: userDetails?.firstname || '',
            lastName: userDetails?.lastname || '',
            provider,
            clientIp,
            clientCountry,
            userId: userIdToEnroll,
            purpose: `COURSE_PURCHASE_${course.id}`,
            metadata: {
              courseId: course.id,
              enrollmentId: activeEnrollment.id,
              userId: userIdToEnroll,
              courseTitle: course.title,
            },
          })
        );

        this.logger.log(`Payment initialized successfully. Checkout URL: ${paymentSession.checkoutUrl}`);

        return {
          ...activeEnrollment,
          checkoutUrl: paymentSession.checkoutUrl,
          message: 'Payment required to complete enrollment'
        };
      } catch (error) {
        this.logger.error(`Failed to initialize payment: ${error.message}`);
        throw new Error('Could not initialize payment for course purchase');
      }
    }

    return activeEnrollment;
  }

  async findAll(user: AuthenticatedUser, query: any = {}) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (academyProfile.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to view all enrollments.',
      );
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    // 1. Fetch the raw enrollment data
    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        skip,
        take: pageSize,
        include: { cohort: true, course: true },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.enrollment.count(),
    ]);

    // --- DATA ENRICHMENT ---
    // 2. Collect all unique user IDs from the enrollments
    const userIds = [...new Set(enrollments.map((e) => e.userId))];
    if (userIds.length === 0)
      return { items: [], total: 0, page, pageSize, totalPages: 0 };

    // 3. Fetch all required user data in a single batch call from the auth-service
    const users = await this.userService.getUsersByIds(userIds);

    // 4. Map the user data back to the enrollments
    return {
      items: enrollments.map((enrollment) => ({
        ...enrollment,
        user: users.find((u) => u.firebaseId === enrollment.userId) || null,
      })),
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
    if (query.cohortId) where.cohortId = Number(query.cohortId);

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: pageSize,
        include: { cohort: true, course: true },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    const userIds = [...new Set(enrollments.map((e) => e.userId))];
    if (userIds.length === 0)
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    const users = await this.userService.getUsersByIds(userIds);

    return {
      items: enrollments.map((enrollment) => ({
        ...enrollment,
        user: users.find((u) => u.firebaseId === enrollment.userId) || null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByCohort(
    cohortId: number,
    user: AuthenticatedUser,
    query: any = {},
  ) {
    // AUTHORIZATION: User must be an ADMIN or the INSTRUCTOR of the course
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: { course: true },
    });
    if (!cohort) {
      throw new NotFoundException('Cohort not found');
    }

    const isInstructor = cohort.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to view enrollments for this cohort.',
      );
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    // Same enrichment pattern as findAll()
    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { cohortId },
        skip,
        take: pageSize,
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.enrollment.count({ where: { cohortId } }),
    ]);

    const userIds = [...new Set(enrollments.map((e) => e.userId))];
    if (userIds.length === 0)
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    const users = await this.userService.getUsersByIds(userIds);
    return {
      items: enrollments.map((enrollment) => ({
        ...enrollment,
        user: users.find((u) => u.firebaseId === enrollment.userId) || null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async remove(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // AUTHORIZATION: User must be an ADMIN or the person who is enrolled.
    // (An instructor could also be allowed, add that logic if needed).
    const isEnrolledUser = enrollment.userId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isEnrolledUser && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to remove this enrollment.',
      );
    }

    return await this.prisma.enrollment.delete({ where: { id } });
  }

  async findMyEnrollments(user: AuthenticatedUser) {
    // Fetch the enrollments for the current user
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: user.firebaseId },
      include: {
        cohort: {
          include: { course: true },
        },
        // Also include direct course enrollment (when cohort is null)
        course: true,
      },
    });

    return enrollments.map((enrollment) => {
      // If this is a cohort-based enrollment, use the cohort's course
      if (enrollment.cohort) {
        return {
          ...enrollment,
          course: enrollment.cohort.course,
        };
      }
      // If this is a direct course enrollment, use the course directly
      return {
        ...enrollment,
        course: enrollment.course,
      };
    });
  }

  async findByUserId(userId: string, requestingUser: AuthenticatedUser) {
    // AUTHORIZATION: User must be an ADMIN or the person whose enrollments are being requested.
    const academyProfile =
      await this.userService.getOrCreateProfile(requestingUser);
    const isRequestedUser = userId === requestingUser.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isRequestedUser && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to view these enrollments.',
      );
    }

    // Fetch the enrollments for the specified user
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        cohort: {
          include: { course: true },
        },
        // Also include direct course enrollment (when cohort is null)
        course: true,
      },
    });

    return enrollments.map((enrollment) => {
      // If this is a cohort-based enrollment, use the cohort's course
      if (enrollment.cohort) {
        return {
          ...enrollment,
          course: enrollment.cohort.course,
        };
      }
      // If this is a direct course enrollment, use the course directly
      return {
        ...enrollment,
        course: enrollment.course,
      };
    });
  }

  async findByCourse(
    courseId: number,
    user: AuthenticatedUser,
    query: any = {},
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const isInstructor = course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to view enrollments for this course.',
      );
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId },
        skip,
        take: pageSize,
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.enrollment.count({ where: { courseId } }),
    ]);

    const userIds = [...new Set(enrollments.map((e) => e.userId))];
    if (userIds.length === 0)
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    const users = await this.userService.getUsersByIds(userIds);
    return {
      items: enrollments.map((enrollment) => ({
        ...enrollment,
        user: users.find((u) => u.firebaseId === enrollment.userId) || null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
