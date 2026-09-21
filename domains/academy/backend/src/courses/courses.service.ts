import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AcademyRole, CourseStatus, LessonType } from '../generated/client';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { PushNotificationService } from '@alikohub/notification';

type FindAllQuery = {
  page?: number;
  pageSize?: number;
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
          this.paymentClient.send({ cmd: 'resolve_payment_config' }, { clientIp, clientCountry }),
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
    // Automatically set status to PUBLISHED for instructors to make courses visible on homepage
    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        shortDescription: dto.shortDescription,
        longDescription: dto.longDescription,
        thumbnail: dto.thumbnail,
        category: dto.category,
        // Automatically set to DRAFT to allow teacher to add content before approval
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

      if (query.category) where.category = query.category;
      if (query.targetLevel) where.targetLevel = query.targetLevel;
      if (query.difficulty) where.targetLevel = query.difficulty;
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
      const pageSize = Number(query.pageSize) || 10;
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

        return {
          ...course,
          currency,
          price,
          priceInEtb: course.price,
          priceInUsd: course.priceInUsd,
          modulesCount: course._count?.modules || 0,
          enrolledNum: course._count?.enrollments || course.enrolledNum || 0,
          instructor: authInfo
            ? {
                ...authInfo,
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
    return {
      ...course,
      currency,
      price,
      priceInEtb: course.price,
      priceInUsd: course.priceInUsd,
      enrolledNum: enrollmentCount, // Override the stored enrolledNum with actual count
      instructor,
    };
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

    // Only an admin can re-assign an instructor
    if (dto.instructorId && academyProfile.role !== AcademyRole.ADMIN) {
      throw new ForbiddenException(
        'Only an admin can change the course instructor',
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

    return await this.prisma.course.delete({ where: { id } });
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

    return await this.prisma.course.update({
      where: { id },
      data: { status },
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

    const course = await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.PUBLISHED },
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
}
