import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AcademyRole, CourseStatus, LessonType } from '@prisma/client/academy';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { PushNotificationService } from '@alikohub/notification';
import { sanitizeCourseExercises, stripExerciseAnswer } from '../common/utils/sanitize-exercises';
import { HealthCompliancePolicy } from '../common/policies/health-compliance.policy';

type FindAllQuery = {
  page?: number;
  pageSize?: number;
  limit?: number;
  status?: CourseStatus;
  instructorId?: string;
  category?: string;
  difficulty?: string; // Add this
  targetLevel?: string; // Add this
  q?: string; // search in title/description
};

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);
  private readonly notificationService = new PushNotificationService();

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient?: ClientProxy,
  ) {}

  private async resolveGeoConfig(clientIp?: string, clientCountry?: string): Promise<{ currency: string; provider: string }> {
    try {
      if (this.paymentClient) {
        const config = await lastValueFrom(
          this.paymentClient.send({ cmd: 'resolve_payment_config' }, { clientIp, clientCountry }).pipe(timeout(1500)),
        );
        if (config && config.currency) {
          return config;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to resolve geo config for course currency: ${error.message}`);
    }
    return { currency: 'ETB', provider: 'CHAPA' };
  }

  async create(dto: CreateCourseDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (
      academyProfile.role !== AcademyRole.INSTRUCTOR &&
      academyProfile.role !== AcademyRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to create a course.',
      );
    }

    const instructorId = user.firebaseId;

    const exists = await this.prisma.course.findFirst({
      where: { title: dto.title, instructorId: instructorId },
    });
    if (exists)
      throw new BadRequestException(
        'You already have a course with this title',
      );

    // Validate URL if provided
    if (dto.thumbnail) {
      try {
        new URL(dto.thumbnail);
      } catch (_e) {
        throw new BadRequestException('Invalid thumbnail URL');
      }
    }

    // Create course with only the fields that exist in the Prisma model
    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        shortDescription: dto.shortDescription || (dto as any).description,
        longDescription: dto.longDescription || (dto as any).description,
        thumbnail: dto.thumbnail,
        category: dto.category,
        domain: (dto as any).domain || 'GENERAL',
        regulatoryBody: (dto as any).regulatoryBody || null,
        complianceProfile: (dto as any).complianceProfile || undefined,
        // Automatically set to DRAFT to allow teacher to add content before approval
        status: dto.status || CourseStatus.DRAFT,
        skills: dto.skills || [],
        conceptsLearned: dto.conceptsLearned || [],
        outcomes: (dto as any).outcomes || [],
        estimatedTime: dto.estimatedTime ? Number(dto.estimatedTime) : null,
        targetLevel: dto.targetLevel || (dto as any).level,
        enrolledNum: dto.enrolledNum ? Number(dto.enrolledNum) : 0,
        rating: null, // CA-06: Do not allow static/fake ratings on course creation
        isStateApproved: false, // CA-06: Only ADMIN can mark state-approved
        price: dto.price !== undefined && dto.price !== null ? Number(dto.price) : null,
        priceInUsd: dto.priceInUsd !== undefined && dto.priceInUsd !== null ? Number(dto.priceInUsd) : null,
        prerequisites: dto.prerequisites || [],
        languages: dto.languages || [],
        instructorId: instructorId,
      },
    });

    // Create a default cohort for the course only if requested
    if (dto.createDefaultCohort) {
      try {
        await this.prisma.cohort.create({
          data: {
            name: `${course.title} - Default Cohort`,
            courseId: course.id,
            startDate: new Date(),
            endDate: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1),
            ), // 1 year from now
          },
        });
      } catch (cohortError) {
        console.error('Failed to create default cohort:', cohortError);
        // Don't throw an error here as the course creation should still succeed
      }
    }

    return course;
  }

  // --- NEW: Create a course with modules and lessons ---
  async createCourseWithStructure(
    dto: CreateCourseDto & {
      modules: Array<{
        title: string;
        description: string;
        lessons: Array<{
          title: string;
          type: LessonType;
        }>;
      }>;
    },
    user: AuthenticatedUser,
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (
      academyProfile.role !== AcademyRole.INSTRUCTOR &&
      academyProfile.role !== AcademyRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to create a course.',
      );
    }

    const instructorId = user.firebaseId;

    // Check if course with this title already exists
    const exists = await this.prisma.course.findFirst({
      where: { title: dto.title, instructorId: instructorId },
    });
    if (exists)
      throw new BadRequestException(
        'You already have a course with this title',
      );

    // Create course with modules and lessons in a transaction
    const course = await this.prisma.$transaction(async (prisma) => {
      // Create the course
      const newCourse = await prisma.course.create({
        data: {
          title: dto.title,
          shortDescription: dto.shortDescription,
          longDescription: dto.longDescription,
          category: dto.category,
          domain: (dto as any).domain || 'GENERAL',
          regulatoryBody: (dto as any).regulatoryBody || null,
          complianceProfile: (dto as any).complianceProfile || undefined,
          status: dto.status || CourseStatus.DRAFT,
          skills: dto.skills || [],
          conceptsLearned: dto.conceptsLearned || [],
          outcomes: (dto as any).outcomes || [],
          estimatedTime: dto.estimatedTime,
          targetLevel: dto.targetLevel,
          enrolledNum: dto.enrolledNum || 0,
          rating: dto.rating,
          price: dto.price,
          priceInUsd: dto.priceInUsd,
          prerequisites: dto.prerequisites || [],
          languages: dto.languages || [],
          instructorId: instructorId,
        },
      });

      // Create a default cohort for the course only if requested
      if (dto.createDefaultCohort) {
        await prisma.cohort.create({
          data: {
            name: `${newCourse.title} - Default Cohort`,
            courseId: newCourse.id,
            startDate: new Date(),
            endDate: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1),
            ), // 1 year from now
          },
        });
      }

      // Create modules and lessons
      if (dto.modules && dto.modules.length > 0) {
        for (const moduleData of dto.modules) {
          const newModule = await prisma.module.create({
            data: {
              title: moduleData.title,
              description: moduleData.description,
              courseId: newCourse.id,
            },
          });

          // Create lessons for this module
          if (moduleData.lessons && moduleData.lessons.length > 0) {
            for (const lessonData of moduleData.lessons) {
              await prisma.lesson.create({
                data: {
                  title: lessonData.title,
                  type: lessonData.type,
                  moduleId: newModule.id,
                },
              });
            }
          }
        }
      }

      return newCourse;
    });

    return course;
  }

  // REFACTORED: To enrich data with user info and GeoService pricing
  async findAll(
    query: FindAllQuery,
    user?: AuthenticatedUser,
    clientIp?: string,
    clientCountry?: string,
  ) {
    try {
      const geoConfig = await this.resolveGeoConfig(clientIp, clientCountry);
      const currency = geoConfig.currency;
      // Build the where clause
      const where: any = {};

      // Check if user is admin
      let isAdmin = false;
      if (user) {
        const profile = await this.userService.getOrCreateProfile(user);
        isAdmin = profile.role === AcademyRole.ADMIN;
      }

      // Enforce visibility rules
      if (isAdmin) {
        if (query.status) where.status = query.status;
        if (query.instructorId) where.instructorId = query.instructorId;
      } else if (user && query.instructorId === user.firebaseId) {
        // Instructor looking at their own courses - allow filtering by any status
        if (query.status) where.status = query.status;
        where.instructorId = query.instructorId;
      } else {
        // Public view or looking at someone else's courses - only show PUBLISHED
        where.status = CourseStatus.PUBLISHED;
        if (query.instructorId) where.instructorId = query.instructorId;
      }

      if (query.category) {
        where.category = { equals: query.category, mode: 'insensitive' };
      }
      if ((query as any).domain) {
        where.domain = (query as any).domain;
      }
      if (query.targetLevel) {
        where.targetLevel = { equals: query.targetLevel, mode: 'insensitive' };
      }
      if (query.difficulty) {
        where.targetLevel = { equals: query.difficulty, mode: 'insensitive' };
      }
      if (query.q) {
        where.OR = [
          { title: { contains: query.q, mode: 'insensitive' } },
          { shortDescription: { contains: query.q, mode: 'insensitive' } },
          { longDescription: { contains: query.q, mode: 'insensitive' } },
        ];
      }

      // Fetch all matching courses to sort globally in-memory by upcoming cohort schedules
      const allCourses = await this.prisma.course.findMany({
        where,
        include: {
          cohorts: {
            include: {
              teachingSchedules: {
                where: {
                  startTime: { gte: new Date() },
                  cohortId: { not: null },
                },
                orderBy: {
                  startTime: 'asc',
                },
              },
            },
          },
          _count: {
            select: {
              modules: true,
              enrollments: true,
            },
          },
          profile: {
            select: {
              bio: true,
              expertise: true,
              specialization: true,
              role: true,
            },
          },
          // Conditional include for full content when pending approval
          ...(query.status === CourseStatus.PENDING_APPROVAL
            ? {
                modules: {
                  orderBy: { createdAt: 'asc' },
                  include: {
                    lessons: {
                      orderBy: { order: 'asc' },
                      include: {
                        contents: {
                          orderBy: { createdAt: 'asc' },
                        },
                        exercises: {
                          orderBy: { order: 'asc' },
                        },
                      },
                    },
                    exercises: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              }
            : {}),
        },
      });

      // Calculate next upcoming schedule for each course
      const coursesWithSchedules = allCourses.map((course) => {
        let nextScheduleTime: Date | null = null;
        for (const cohort of course.cohorts) {
          for (const schedule of cohort.teachingSchedules) {
            if (!nextScheduleTime || schedule.startTime < nextScheduleTime) {
              nextScheduleTime = schedule.startTime;
            }
          }
        }
        return { course, nextScheduleTime };
      });

      // Sort: Courses with upcoming cohort schedules first (earliest start time first),
      // then courses without schedules (by createdAt descending)
      coursesWithSchedules.sort((a, b) => {
        if (a.nextScheduleTime && b.nextScheduleTime) {
          return a.nextScheduleTime.getTime() - b.nextScheduleTime.getTime();
        }
        if (a.nextScheduleTime) return -1;
        if (b.nextScheduleTime) return 1;
        return b.course.createdAt.getTime() - a.course.createdAt.getTime();
      });

      // Handle pagination on the sorted array
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize || query.limit) || 10;
      const skip = (page - 1) * pageSize;
      const total = coursesWithSchedules.length;

      const courses = coursesWithSchedules
        .slice(skip, skip + pageSize)
        .map((x) => x.course);

      // --- Data Enrichment Step ---
      // Get unique instructor IDs from the courses
      const instructorIds = [...new Set(courses.map((c) => c.instructorId))];

      // Fetch all required instructors in a single batch call from Auth Service
      const authInstructors =
        await this.userService.getUsersByIds(instructorIds);

      // Map everything back to response objects
      const items = courses.map((course: any) => {
        const authInfo = authInstructors.find(
          (i: any) => i.firebaseId === course.instructorId,
        );

        const price =
          currency === 'USD'
            ? course.priceInUsd ?? course.price
            : course.price;

        // CA-01: Strip password hash from instructor data before including in response
        const { password: _pw, ...safeAuthInfo } = authInfo || {} as any;

        // Determine if the requesting user can view exercise answers
        const isInstructor = user?.firebaseId === course.instructorId;
        const canViewAnswers = isAdmin || isInstructor;

        // CA-02: Strip correctAnswer from exercises for non-admin/non-instructor users
        const sanitizedCourse = sanitizeCourseExercises(course, canViewAnswers);

        return {
          ...sanitizedCourse,
          currency,
          price,
          priceInEtb: course.price,
          priceInUsd: course.priceInUsd,
          modulesCount: course._count?.modules || 0,
          enrolledNum: course._count?.enrollments ?? 0, // CA-18: Always use real enrollment count
          instructor: authInfo
            ? {
                ...safeAuthInfo,
                profile: course.profile,
              }
            : null,
          // Remove the raw profile and _count property from the root level of the item
          profile: undefined,
          _count: undefined,
        };
      });

      let statusCounts = {};
      if (isAdmin) {
        const counts = await this.prisma.course.groupBy({
          by: ['status'],
          _count: true,
        });
        statusCounts = counts.reduce((acc, curr) => {
          acc[curr.status] = curr._count;
          return acc;
        }, {});
      }

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        statusCounts: isAdmin ? statusCounts : undefined,
      };
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  // REFACTORED: Use string ID and enrich data with GeoService pricing
  async findOne(
    id: number,
    user?: AuthenticatedUser,
    clientIp?: string,
    clientCountry?: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { createdAt: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                contents: {
                  orderBy: { createdAt: 'asc' },
                },
                exercises: {
                  orderBy: { order: 'asc' },
                },
              },
            },
            exercises: {
              orderBy: { order: 'asc' },
            },
          },
        },
        profile: {
          select: {
            bio: true,
            expertise: true,
            specialization: true,
            role: true,
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    // Visibility Check: If not published, only Admin or Owner can view
    if (course.status !== CourseStatus.PUBLISHED) {
      let isAllowed = false;
      if (user) {
        const profile = await this.userService.getOrCreateProfile(user);
        if (
          profile.role === AcademyRole.ADMIN ||
          course.instructorId === user.firebaseId
        ) {
          isAllowed = true;
        }
      }

      if (!isAllowed) {
        throw new NotFoundException('Course not found');
      }
    }

    // Resolve GeoIP currency & provider
    const geoConfig = await this.resolveGeoConfig(clientIp, clientCountry);
    const currency = geoConfig.currency;
    const price =
      currency === 'USD'
        ? course.priceInUsd ?? course.price
        : course.price;

    // Count enrollments for this course
    const enrollmentCount = await this.prisma.enrollment.count({
      where: {
        courseId: course.id,
      },
    });

    // Enrich with instructor data
    const instructor = await this.userService.getUserById(course.instructorId);
    // CA-01: Strip password hash from instructor data
    const { password: _pw, ...safeInstructor } = instructor || {} as any;

    // CA-02: Determine if requesting user can view exercise answers
    const isInstructor = user?.firebaseId === course.instructorId;
    let isAdmin = false;
    if (user) {
      const profile = await this.userService.getOrCreateProfile(user);
      isAdmin = profile.role === AcademyRole.ADMIN;
    }
    const sanitizedCourse = sanitizeCourseExercises(course, isAdmin || isInstructor);

    return {
      ...sanitizedCourse,
      currency,
      price,
      priceInEtb: course.price,
      priceInUsd: course.priceInUsd,
      enrolledNum: enrollmentCount, // Override the stored enrolledNum with actual count
      instructor: instructor ? safeInstructor : null,
    };
  }

  async findBySlug(
    slug: string,
    user?: AuthenticatedUser,
    clientIp?: string,
    clientCountry?: string,
  ) {
    const numId = Number(slug);
    if (!isNaN(numId) && numId > 0) {
      return this.findOne(numId, user, clientIp, clientCountry);
    }

    const courses = await this.prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
    });
    const found = courses.find((c) => {
      const courseSlug = c.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return courseSlug === slug.toLowerCase();
    });
    if (!found) {
      throw new NotFoundException(`Course not found for slug: ${slug}`);
    }
    return this.findOne(found.id, user, clientIp, clientCountry);
  }

  // REFACTORED: Now performs an ownership check
  async update(id: number, dto: UpdateCourseDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    // OWNERSHIP CHECK: User must be an ADMIN or the original instructor
    if (
      academyProfile.role !== AcademyRole.ADMIN &&
      course.instructorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to edit this course',
      );
    }

    if (course.isLocked) {
      throw new ForbiddenException(
        'This approved course version is locked. Create a new draft version before making changes.',
      );
    }

    // Only an admin can re-assign an instructor or mark a course as state-approved (CA-06)
    if (dto.instructorId && academyProfile.role !== AcademyRole.ADMIN) {
      throw new ForbiddenException(
        'Only an admin can change the course instructor',
      );
    }
    if ((dto as any).isStateApproved !== undefined && academyProfile.role !== AcademyRole.ADMIN) {
      throw new ForbiddenException(
        'Only an admin can change state approval status (CA-06)',
      );
    }

    if (dto.instructorId) {
      const newInstructorProfile = await this.userService.ensureProfileExists(
        dto.instructorId,
      );
      if (!newInstructorProfile) {
        throw new BadRequestException(
          'The assigned user does not exist in the Auth Service.',
        );
      }
      if (
        newInstructorProfile.role !== AcademyRole.INSTRUCTOR &&
        newInstructorProfile.role !== AcademyRole.ADMIN
      ) {
        throw new BadRequestException(
          'The assigned user is not an instructor.',
        );
      }
    }

    return await this.prisma.course.update({ where: { id }, data: dto });
  }

  // REFACTORED: Added ownership check
  async remove(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    if (
      academyProfile.role !== AcademyRole.ADMIN &&
      course.instructorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this course',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      await tx.progress.deleteMany({ where: { courseId: id } });
      await tx.teachingSchedule.deleteMany({ where: { courseId: id } });
      await tx.conversation.deleteMany({ where: { courseId: id } });
      await tx.enrollment.deleteMany({ where: { courseId: id } });
      await tx.cohort.deleteMany({ where: { courseId: id } });
      await tx.exerciseSubmission.deleteMany({
        where: { exercise: { module: { courseId: id } } },
      });
      await tx.exercise.deleteMany({
        where: { module: { courseId: id } },
      });
      await tx.content.deleteMany({
        where: { lesson: { module: { courseId: id } } },
      });
      await tx.lesson.deleteMany({
        where: { module: { courseId: id } },
      });
      await tx.module.deleteMany({ where: { courseId: id } });
      return await tx.course.delete({ where: { id } });
    });
  }

  async updateStatus(
    id: number,
    status: CourseStatus,
    user: AuthenticatedUser,
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // AUTHORIZATION: User must be an ADMIN or the instructor who owns the course.
    if (
      academyProfile.role !== AcademyRole.ADMIN &&
      course.instructorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to change the status of this course',
      );
    }

    // Your existing business logic is still valid
    if (
      course.status === CourseStatus.ARCHIVED &&
      status !== CourseStatus.ARCHIVED
    ) {
      throw new BadRequestException('Archived courses cannot be re-published');
    }

    if (status === CourseStatus.PUBLISHED && HealthCompliancePolicy.isHealthCourse(course)) {
      const checks = await this.getPublishChecks(id);
      if (!checks.canPublish) {
        const failed = checks.checks.filter((c: any) => !c.passed).map((c: any) => c.label);
        throw new BadRequestException(
          `WABON publish checks failed: ${failed.join('; ')}`,
        );
      }
    }

    return await this.prisma.course.update({
      where: { id },
      data: {
        status,
        ...(status === CourseStatus.PUBLISHED && HealthCompliancePolicy.isHealthCourse(course)
          ? { isLocked: true }
          : {}),
      },
    });
  }

  // REFACTORED: Now an admin-only action
  async assignInstructor(
    id: number,
    newInstructorId: string,
    user: AuthenticatedUser,
  ) {
    // AUTHORIZATION: In this business model, we'll say only an ADMIN can re-assign a course.
    // This prevents instructors from passing courses between themselves without oversight.
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (academyProfile.role !== AcademyRole.ADMIN) {
      throw new ForbiddenException(
        'Only an administrator can assign an instructor',
      );
    }

    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Validate that the new instructor is a valid user with the correct role
    const newInstructorProfile =
      await this.userService.ensureProfileExists(newInstructorId);
    if (!newInstructorProfile) {
      throw new BadRequestException(
        'The assigned user does not exist in the Auth Service.',
      );
    }
    if (
      newInstructorProfile.role !== AcademyRole.INSTRUCTOR &&
      newInstructorProfile.role !== AcademyRole.ADMIN
    ) {
      throw new BadRequestException(
        'The assigned user is not a valid instructor.',
      );
    }

    return await this.prisma.course.update({
      where: { id },
      data: { instructorId: newInstructorId },
    });
  }

  // --- NEW: Get course with full structure (modules, lessons, content) ---
  async getCourseWithStructure(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                contents: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    // Authorization check
    if (academyProfile.role === 'STUDENT' && course.status !== 'PUBLISHED') {
      throw new ForbiddenException('You do not have access to this course.');
    }

    if (
      academyProfile.role === (AcademyRole.INSTRUCTOR as any) &&
      course.instructorId !== user.firebaseId &&
      academyProfile.role !== (AcademyRole.ADMIN as any)
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this course.',
      );
    }

    return course;
  }

  // --- NEW: Get instructor's courses with stats ---
  async getInstructorCoursesWithStats(user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (
      academyProfile.role !== AcademyRole.INSTRUCTOR &&
      academyProfile.role !== AcademyRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to view courses.',
      );
    }

    const courses = await this.prisma.course.findMany({
      where: { instructorId: user.firebaseId },
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                contents: true,
              },
            },
          },
        },
        _count: {
          select: {
            cohorts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add stats to each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        // Count total enrollments
        const enrollments = await this.prisma.enrollment.count({
          where: {
            cohort: {
              courseId: course.id,
            },
          },
        });

        // Count total modules, lessons, and content
        const modulesCount = course.modules.length;
        const lessonsCount = course.modules.reduce(
          (sum, module) => sum + module.lessons.length,
          0,
        );
        const contentCount = course.modules.reduce(
          (sum, module) =>
            sum +
            module.lessons.reduce(
              (lessonSum, lesson) => lessonSum + lesson.contents.length,
              0,
            ),
          0,
        );

        return {
          ...course,
          stats: {
            enrollments,
            modules: modulesCount,
            lessons: lessonsCount,
            contentItems: contentCount,
          },
        };
      }),
    );

    return coursesWithStats;
  }

  // --- NEW: Get instructor's draft courses ---
  async getInstructorDraftCourses(user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (
      academyProfile.role !== AcademyRole.INSTRUCTOR &&
      academyProfile.role !== AcademyRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to view courses.',
      );
    }

    const courses = await this.prisma.course.findMany({
      where: {
        instructorId: user.firebaseId,
        status: CourseStatus.DRAFT,
      },
      include: {
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return courses.map((course: any) => ({
      ...course,
      modulesCount: course._count?.modules || 0,
      enrolledNum: course._count?.enrollments || course.enrolledNum || 0,
      _count: undefined,
    }));
  }

  async submitForApproval(id: number, user: AuthenticatedUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.instructorId !== user.firebaseId) {
      throw new ForbiddenException(
        'You do not have permission to submit this course for approval',
      );
    }
    if (
      course.status !== CourseStatus.DRAFT &&
      course.status !== CourseStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Only draft or rejected courses can be submitted for approval',
      );
    }

    return await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.PENDING_APPROVAL },
    });
  }

  async approve(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (academyProfile.role !== AcademyRole.ADMIN) {
      throw new ForbiddenException('Only administrators can approve courses');
    }

    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Course not found');

    const isHealth = HealthCompliancePolicy.isHealthCourse(existing);
    if (isHealth) {
      const checks = await this.getPublishChecks(id);
      if (!checks.canPublish) {
        const failed = checks.checks.filter((c: any) => !c.passed).map((c: any) => c.label);
        throw new BadRequestException(
          `Cannot approve HEALTH course until WABON publish checks pass: ${failed.join('; ')}`,
        );
      }
    }

    const course = await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.PUBLISHED,
        ...(isHealth ? { isLocked: true, isStateApproved: true } : {}),
      },
    });

    this.notificationService.sendCourseCreatedNotification(
      course.title,
      String(course.id),
      course.category || undefined,
    ).catch(err => this.logger.error('Failed to send course push notification:', err));

    return course;
  }

  async reject(id: number, reason: string, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    if (academyProfile.role !== AcademyRole.ADMIN) {
      throw new ForbiddenException('Only administrators can reject courses');
    }

    return await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.REJECTED,
        rejectionReason: reason,
      },
    });
  }

  /**
   * I3: WABON Hours Check (35h/33h/40h = 108h) & Publish Readiness Checks
   */
  async getPublishChecks(courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
          include: {
            lessons: {
              include: {
                contents: true,
                exercises: true,
              },
            },
            exercises: true,
            discussionTopics: true,
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (!HealthCompliancePolicy.isHealthCourse(course)) {
      return {
        courseId: course.id,
        domain: course.domain,
        isHealthCourse: false,
        canPublish: true,
        checks: [],
      };
    }

    const profile = HealthCompliancePolicy.getComplianceProfile(course)!;
    const allLessons = course.modules.flatMap((m) => m.lessons);
    const allContents = allLessons.flatMap((l) => l.contents);
    const allExercises = [
      ...course.modules.flatMap((m) => m.exercises),
      ...allLessons.flatMap((l) => l.exercises),
    ];
    const allTopics = course.modules.flatMap((m) => m.discussionTopics);

    // Sum hours by hourType
    let theoryHours = 0;
    let labHours = 0;
    let clinicalHours = 0;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (!lesson.isCreditHour) continue;
        const hrs = lesson.estimatedHours || 0;
        const ht = (lesson.hourType || '').toUpperCase();
        if (ht === 'CLINICAL' || mod.track === 'CLINICAL_IN_PERSON' || lesson.type === 'CLINICAL') {
          clinicalHours += hrs;
        } else if (ht === 'LAB' || mod.track === 'SKILLS_LAB_IN_PERSON' || lesson.type === 'SKILLS') {
          labHours += hrs;
        } else if (ht === 'THEORY') {
          theoryHours += hrs;
        }
      }
    }
    theoryHours = Number(theoryHours.toFixed(2));
    labHours = Number(labHours.toFixed(2));
    clinicalHours = Number(clinicalHours.toFixed(2));
    const totalHours = Number((theoryHours + labHours + clinicalHours).toFixed(2));

    const hoursMet =
      theoryHours >= profile.requiredTheoryHours &&
      labHours >= profile.requiredLabHours &&
      clinicalHours >= profile.requiredClinicalHours;

    const unitModules = course.modules.filter(
      (m) => !m.isOrientationModule && m.unitNumber && m.unitNumber >= 1 && m.unitNumber <= 9,
    );
    const hasOrientation = course.modules.some((m) => m.isOrientationModule);
    const unitsHaveTenPattern =
      unitModules.length === 9 && unitModules.every((u) => u.lessons.length >= 10);

    const videoContents = allContents.filter((c) => c.type === 'VIDEO');
    const linkedVideos = videoContents.filter((c) => Boolean(c.url && c.url.trim().length > 0));

    const quizzes = allExercises.filter((e) => e.type === 'MULTIPLE_CHOICE' || e.isProctored);
    const quizPoolsValid =
      quizzes.length > 0 &&
      quizzes.every((q) => {
        const qCount = Array.isArray(q.question) ? (q.question as any[]).length : 1;
        const draw = q.poolSize || qCount;
        return qCount >= draw && (q.poolSize ? qCount >= q.poolSize : true);
      });

    const activities = allExercises.filter(
      (e) => e.type === 'MASLOW_PYRAMID' || e.type === 'STORY_ACTIVITY',
    );
    const rubricsValid =
      activities.every((a) => Boolean(a.rubricId)) &&
      allTopics.every((t) => Boolean(t.rubricId || t.rubric));

    const nonLoginFiles = allContents.filter(
      (c) => c.isDownloadable || c.visibility !== 'LOGGED_IN_ONLY',
    );

    const coreSkills = await this.prisma.coreSkill.findMany({
      select: { id: true, taughtInUnit: true },
    });
    const mappedSkills = coreSkills.filter((s) => Boolean(s.taughtInUnit));

    const checks = [
      {
        key: 'hoursCheck',
        label: `Trimodal hours (${theoryHours}h / ${labHours}h / ${clinicalHours}h = ${totalHours}h vs ${profile.requiredTheoryHours}/${profile.requiredLabHours}/${profile.requiredClinicalHours}h)`,
        passed: hoursMet,
        details: { theoryHours, labHours, clinicalHours, totalHours },
      },
      {
        key: 'unitPatternCheck',
        label: `Orientation + 9 units with 10-lesson pattern (${unitModules.length}/9 units)`,
        passed: hasOrientation && unitsHaveTenPattern,
        details: { hasOrientation, unitCount: unitModules.length },
      },
      {
        key: 'videoLinksCheck',
        label: `WABON videos linked (${linkedVideos.length} of ${videoContents.length})`,
        passed: videoContents.length === 0 || linkedVideos.length === videoContents.length,
        details: { linked: linkedVideos.length, total: videoContents.length },
      },
      {
        key: 'quizPoolCheck',
        label: `Unit quizzes have valid question pools (${quizzes.length} quizzes)`,
        passed: quizPoolsValid,
        details: { quizCount: quizzes.length },
      },
      {
        key: 'rubricsCheck',
        label: 'Every graded activity and discussion has a rubric',
        passed: rubricsValid,
        details: { activities: activities.length, discussions: allTopics.length },
      },
      {
        key: 'loginOnlyFilesCheck',
        label: 'WABON files set to login-only & download disabled',
        passed: nonLoginFiles.length === 0,
        details: { nonCompliantFiles: nonLoginFiles.length },
      },
      {
        key: 'skillsMappingCheck',
        label: `22 tested skills mapped to units (${mappedSkills.length}/${coreSkills.length})`,
        passed: coreSkills.length >= 22 && mappedSkills.length >= 22,
        details: { mapped: mappedSkills.length, total: coreSkills.length },
      },
    ];

    return {
      courseId: course.id,
      domain: course.domain,
      isHealthCourse: true,
      canPublish: checks.every((c) => c.passed),
      hoursSummary: {
        theoryHours,
        labHours,
        clinicalHours,
        totalHours,
        required: {
          theory: profile.requiredTheoryHours,
          lab: profile.requiredLabHours,
          clinical: profile.requiredClinicalHours,
        },
      },
      checks,
    };
  }

  /**
   * I2: Create a new draft version from a locked/approved course
   */
  async createNewVersion(courseId: number, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
    const source = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
          include: {
            lessons: { orderBy: { order: 'asc' }, include: { contents: true } },
            discussionTopics: true,
          },
        },
      },
    });
    if (!source) throw new NotFoundException('Course not found');
    if (profile.role !== AcademyRole.ADMIN && source.instructorId !== user.firebaseId) {
      throw new ForbiddenException('You do not have permission to version this course.');
    }

    const parts = (source.version || '1.0').split('.').map(Number);
    const nextVersion = `${parts[0] || 1}.${(parts[1] ?? 0) + 1}`;

    return this.prisma.$transaction(async (tx) => {
      const cloned = await tx.course.create({
        data: {
          title: `${source.title} (v${nextVersion})`,
          shortDescription: source.shortDescription,
          longDescription: source.longDescription,
          thumbnail: source.thumbnail,
          category: source.category,
          domain: source.domain,
          regulatoryBody: source.regulatoryBody,
          complianceProfile: source.complianceProfile ?? undefined,
          instructorId: source.instructorId,
          status: CourseStatus.DRAFT,
          version: nextVersion,
          isLocked: false,
          parentCourseId: source.id,
          skills: source.skills,
          conceptsLearned: source.conceptsLearned,
          outcomes: source.outcomes,
          estimatedTime: source.estimatedTime,
          targetLevel: source.targetLevel,
          prerequisites: source.prerequisites,
          languages: source.languages,
          agreementDocUrl: source.agreementDocUrl,
        },
      });

      for (const mod of source.modules) {
        const clonedMod = await tx.module.create({
          data: {
            title: mod.title,
            description: mod.description,
            courseId: cloned.id,
            track: mod.track,
            isOrientationModule: mod.isOrientationModule,
            unitNumber: mod.unitNumber,
            targetTheoryHours: mod.targetTheoryHours,
            targetLabHours: mod.targetLabHours,
            studentGuidePages: mod.studentGuidePages,
            characters: mod.characters,
          },
        });

        for (const lesson of mod.lessons) {
          await tx.lesson.create({
            data: {
              title: lesson.title,
              type: lesson.type,
              moduleId: clonedMod.id,
              order: lesson.order,
              maxScore: lesson.maxScore,
              unlockRules: lesson.unlockRules ?? undefined,
              isWeekOneAttendanceGate: lesson.isWeekOneAttendanceGate,
              isOrientationLesson: lesson.isOrientationLesson,
              isCreditHour: lesson.isCreditHour,
              estimatedHours: lesson.estimatedHours,
              hourType: lesson.hourType,
              countsTowardSeatTime: lesson.countsTowardSeatTime,
              mappedCompetency: lesson.mappedCompetency,
              crosswalkRow: lesson.crosswalkRow,
              contents: {
                create: lesson.contents.map((c) => ({
                  title: c.title,
                  type: c.type,
                  url: c.url,
                  body: c.body,
                  durationSeconds: c.durationSeconds,
                  isDownloadable: c.isDownloadable,
                  visibility: c.visibility,
                  transcript: c.transcript,
                })),
              },
            },
          });
        }
      }

      return cloned;
    });
  }

  /**
   * I2: Lock an approved course version
   */
  async lockCourse(courseId: number, locked: boolean, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role !== AcademyRole.ADMIN) {
      throw new ForbiddenException('Only administrators can lock or unlock course versions.');
    }
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.course.update({
      where: { id: courseId },
      data: { isLocked: locked },
    });
  }

  /**
   * I3: One-click Import WABON Template (Module 0 + Units 1-9 + Modules 10-12)
   */
  async importWabonTemplate(
    user: AuthenticatedUser,
    courseId?: number,
    title?: string,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role !== AcademyRole.INSTRUCTOR && profile.role !== AcademyRole.ADMIN) {
      throw new ForbiddenException('Only instructors and admins can import the WABON template.');
    }

    return this.prisma.$transaction(async (tx) => {
      let targetCourse = courseId
        ? await tx.course.findUnique({ where: { id: courseId } })
        : null;

      if (courseId && !targetCourse) throw new NotFoundException('Course not found');
      if (targetCourse?.isLocked) {
        throw new ForbiddenException('Cannot import template into a locked course.');
      }

      if (!targetCourse) {
        targetCourse = await tx.course.create({
          data: {
            title: title || 'WABON Nursing Assistant Certified (NA-C) Program',
            shortDescription: 'WAC 246-841A compliant 108-hour hybrid CNA training program.',
            category: 'Healthcare',
            domain: 'HEALTH',
            regulatoryBody: 'WABON',
            instructorId: user.firebaseId,
            status: CourseStatus.DRAFT,
            version: '1.0',
          },
        });
      }

      // Module 0: Orientation
      await tx.module.create({
        data: {
          title: 'Module 0 · Program Orientation',
          description: '9-item mandatory WABON orientation (non-credit)',
          courseId: targetCourse.id,
          track: 'THEORY_ASYNC',
          isOrientationModule: true,
          unitNumber: 0,
          lessons: {
            create: [
              '0-1 · Welcome session (live)',
              '0-2 · Program rules',
              '0-3 · Your schedule',
              '0-4 · Using the LMS',
              '0-5 · Online conduct & integrity',
              '0-6 · How this course works',
              '0-7 · Lab & clinical expectations',
              '0-8 · Technology check',
              '0-9 · Sign enrollment agreement',
            ].map((t, idx) => ({
              title: t,
              type: idx === 0 ? LessonType.LIVE : idx === 8 ? LessonType.SIGNATURE : LessonType.CHECKLIST,
              order: idx + 1,
              isOrientationLesson: true,
              isCreditHour: false,
              estimatedHours: 0,
              hourType: 'NON_CREDIT',
              countsTowardSeatTime: false,
            })),
          },
        },
      });

      // Units 1-9 (10-lesson pattern)
      const unitTitles = [
        'Unit 1 · Role & Communication',
        'Unit 2 · Resident Rights & Ethics',
        'Unit 3 · Safety & Emergencies',
        'Unit 4 · Infection Prevention',
        'Unit 5 · Body Mechanics & Mobility',
        'Unit 6 · Basic Nursing & Vital Signs',
        'Unit 7 · Personal Care & ADLs',
        'Unit 8 · Restorative & Elimination',
        'Unit 9 · End-of-Life & Post-Mortem Care',
      ];
      const pattern: Array<{ title: string; type: LessonType; hourType: string; hrs: number; credit: boolean }> = [
        { title: 'L1 · Start here', type: LessonType.TEXT, hourType: 'THEORY', hrs: 0.1, credit: true },
        { title: 'L2 · Introduction video', type: LessonType.VIDEO, hourType: 'THEORY', hrs: 0.25, credit: true },
        { title: 'L3 · Student Guide & Textbook Reading', type: LessonType.READING, hourType: 'THEORY', hrs: 1.0, credit: true },
        { title: 'L4 · Mini-lessons', type: LessonType.TEXT, hourType: 'THEORY', hrs: 0.85, credit: true },
        { title: 'L5 · Maslow Pyramid Activity', type: LessonType.ASSIGNMENT, hourType: 'THEORY', hrs: 0.5, credit: true },
        { title: 'L6 · Story Activity', type: LessonType.ASSIGNMENT, hourType: 'THEORY', hrs: 0.45, credit: true },
        { title: 'L7 · Unit Discussion', type: LessonType.DISCUSSION, hourType: 'THEORY', hrs: 0.4, credit: true },
        { title: 'L8 · Get ready for lab', type: LessonType.VIDEO, hourType: 'NON_CREDIT', hrs: 0, credit: false },
        { title: 'L9 · Unit Quiz (proctored)', type: LessonType.QUIZ, hourType: 'THEORY', hrs: 0.34, credit: true },
        { title: 'L10 · Lab day (in person)', type: LessonType.SKILLS, hourType: 'LAB', hrs: 2.78, credit: true },
      ];

      for (let u = 0; u < unitTitles.length; u++) {
        await tx.module.create({
          data: {
            title: unitTitles[u],
            description: `WABON Common Curriculum ${unitTitles[u]}`,
            courseId: targetCourse.id,
            track: 'THEORY_ASYNC',
            unitNumber: u + 1,
            targetTheoryHours: 3.89,
            targetLabHours: 2.78,
            lessons: {
              create: pattern.map((p, idx) => ({
                title: p.title,
                type: p.type,
                order: idx + 1,
                isCreditHour: p.credit,
                estimatedHours: p.hrs,
                hourType: p.hourType,
                countsTowardSeatTime: p.hourType === 'THEORY',
              })),
            },
          },
        });
      }

      // Modules 10-12
      await tx.module.create({
        data: {
          title: 'Module 10 · Mock Skills',
          description: 'Timed pre-clinical and pre-state-exam mock skills (8h lab)',
          courseId: targetCourse.id,
          track: 'SKILLS_LAB_IN_PERSON',
          unitNumber: 10,
          targetLabHours: 8,
          lessons: {
            create: [
              { title: 'M-1 · Mock skills (before clinical)', type: LessonType.SKILLS, order: 1, estimatedHours: 4, hourType: 'LAB', countsTowardSeatTime: false },
              { title: 'M-2 · Mock skills (after clinical)', type: LessonType.SKILLS, order: 2, estimatedHours: 4, hourType: 'LAB', countsTowardSeatTime: false },
            ],
          },
        },
      });

      await tx.module.create({
        data: {
          title: 'Module 11 · Clinical Training',
          description: '40 hours supervised direct resident care (5 × 8-h shifts)',
          courseId: targetCourse.id,
          track: 'CLINICAL_IN_PERSON',
          unitNumber: 11,
          lessons: {
            create: [
              { title: 'C-0 · Facility orientation', type: LessonType.CLINICAL, order: 1, isCreditHour: false, estimatedHours: 0, hourType: 'NON_CREDIT', countsTowardSeatTime: false },
              { title: 'C-1 · Clinical shifts (40h)', type: LessonType.CLINICAL, order: 2, isCreditHour: true, estimatedHours: 40, hourType: 'CLINICAL', countsTowardSeatTime: false },
            ],
          },
        },
      });

      await tx.module.create({
        data: {
          title: 'Module 12 · State Exam Prep & Certificate',
          description: 'Final state competency exam preparation and WABON certificate',
          courseId: targetCourse.id,
          track: 'THEORY_ASYNC',
          unitNumber: 12,
          lessons: {
            create: [
              { title: 'State Exam Readiness & Evaluation', type: LessonType.TEXT, order: 1, isCreditHour: false, estimatedHours: 0, hourType: 'NON_CREDIT', countsTowardSeatTime: false },
            ],
          },
        },
      });

      return targetCourse;
    });
  }

  /**
   * A5: Compare a draft course version against its locked parent version
   */
  async getVersionDiff(courseId: number) {
    const draft = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
          include: { lessons: { select: { id: true, title: true, estimatedHours: true, hourType: true } } },
        },
      },
    });
    if (!draft) throw new NotFoundException('Course not found');

    if (!draft.parentCourseId) {
      return {
        courseId: draft.id,
        version: draft.version,
        parentCourseId: null,
        requiresWabonApproval: false,
        changes: [],
      };
    }

    const parent = await this.prisma.course.findUnique({
      where: { id: draft.parentCourseId },
      include: {
        modules: {
          orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
          include: { lessons: { select: { id: true, title: true, estimatedHours: true, hourType: true } } },
        },
      },
    });
    if (!parent) {
      return {
        courseId: draft.id,
        version: draft.version,
        parentCourseId: draft.parentCourseId,
        requiresWabonApproval: false,
        changes: [],
      };
    }

    const sumHours = (c: typeof draft) =>
      c.modules.reduce(
        (s, m) => s + m.lessons.reduce((ls, l) => ls + (l.estimatedHours || 0), 0),
        0,
      );

    const draftHours = Number(sumHours(draft).toFixed(2));
    const parentHours = Number(sumHours(parent).toFixed(2));
    const hoursChanged = Math.abs(draftHours - parentHours) > 0.1;
    const unitsChanged = draft.modules.length !== parent.modules.length;

    const parentByTitle = new Map(parent.modules.map((m) => [m.title, m]));
    const changes: Array<{ area: string; change: string; wabonApprovalNeeded: boolean }> = [];

    for (const mod of draft.modules) {
      const prev = parentByTitle.get(mod.title);
      if (!prev) {
        changes.push({
          area: mod.title,
          change: `Added module with ${mod.lessons.length} lessons`,
          wabonApprovalNeeded: true,
        });
      } else if (prev.lessons.length !== mod.lessons.length) {
        changes.push({
          area: mod.title,
          change: `Lesson count changed (${prev.lessons.length} -> ${mod.lessons.length})`,
          wabonApprovalNeeded: false,
        });
      }
    }

    return {
      courseId: draft.id,
      version: draft.version,
      parentCourseId: parent.id,
      parentVersion: parent.version,
      hoursDelta: Number((draftHours - parentHours).toFixed(2)),
      requiresWabonApproval: hoursChanged || unitsChanged || changes.some((c) => c.wabonApprovalNeeded),
      changes,
    };
  }
}
