import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client/academy';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { stripExerciseAnswer } from '../common/utils/sanitize-exercises';
import { HealthCompliancePolicy } from '../common/policies/health-compliance.policy';

@Injectable()
export class LessonsService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(dto: CreateLessonDto, user: AuthenticatedUser) {
    const { title, type, dueDate, maxScore, moduleId, contents } = dto;
    const academyProfile = await this.userService.getOrCreateProfile(user);

    // Fetch the module and its parent course for the ownership check
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    const isInstructor = module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to add a lesson to this module.',
      );
    }

    if (module.course.isLocked) {
      throw new ForbiddenException(
        'This approved course version is locked. Create a new draft version to edit lessons.',
      );
    }

    const isHealth = HealthCompliancePolicy.isHealthCourse(module.course);

    return await this.prisma.lesson.create({
      data: {
        title,
        type,
        maxScore,
        order: dto.order || 0,
        unlockRules: dto.unlockRules || ({} as object),
        dueDate: dueDate ? new Date(dueDate) : null,
        ...(dto.estimatedHours !== undefined ? { estimatedHours: dto.estimatedHours } : {}),
        ...(dto.hourType !== undefined ? { hourType: dto.hourType } : {}),
        ...(dto.countsTowardSeatTime !== undefined ? { countsTowardSeatTime: dto.countsTowardSeatTime } : {}),
        ...(dto.mappedCompetency !== undefined ? { mappedCompetency: dto.mappedCompetency } : {}),
        ...(dto.crosswalkRow !== undefined ? { crosswalkRow: dto.crosswalkRow } : {}),
        module: { connect: { id: moduleId } },
        ...(contents && contents.length > 0
          ? {
              contents: {
                create: contents.map((c) => {
                  const { lessonId: _lessonId, ...rest } = c;
                  return {
                    ...rest,
                    ...(isHealth ? { isDownloadable: false, visibility: 'LOGGED_IN_ONLY' } : {}),
                  };
                }),
              },
            }
          : {}),
      },
    });
  }

  async findByModule(
    moduleId: number,
    user: AuthenticatedUser,
    query: Record<string, any> = {},
  ) {
    console.log(`=== Authorization Check for Lessons ===`);
    console.log(`User ID: ${user.firebaseId}`);
    console.log(`Module ID: ${moduleId}`);

    const academyProfile = await this.userService.getOrCreateProfile(user);
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });

    if (!module) throw new NotFoundException('Module not found');

    const courseId = module.courseId;
    const instructorId = module.course.instructorId;

    // AUTHORIZATION: Check if the user is an admin, the course instructor, auditor, OR enrolled.
    const isAdmin = academyProfile.role === 'ADMIN';
    const isInstructor = instructorId === user.firebaseId;
    const isAuditor = academyProfile.role === 'COMMISSION_AUDITOR';
    let isEnrolled = false;

    if (!isAdmin && !isInstructor && !isAuditor) {
      // Check for enrollment
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: user.firebaseId,
          OR: [
            { courseId: courseId, cohortId: null },
            { cohort: { courseId: courseId } },
          ],
        },
      });
      isEnrolled = !!enrollment;
    }

    if (!isAdmin && !isInstructor && !isAuditor && !isEnrolled) {
      throw new ForbiddenException(
        'You must be enrolled in this course to view its lessons.',
      );
    }

    // WABON Req 11: Mandatory Orientation Prerequisite Gate (HEALTH courses only)
    if (
      !isAdmin &&
      !isInstructor &&
      !isAuditor &&
      isEnrolled &&
      HealthCompliancePolicy.isHealthCourse(module.course)
    ) {
      const orientationModule = await this.prisma.module.findFirst({
        where: { courseId, isOrientationModule: true },
      });
      if (orientationModule && !module.isOrientationModule) {
        const studentApp = await this.prisma.studentAdmissionsApplication.findFirst({
          where: { userId: user.firebaseId, orientationCompleted: true },
        });
        if (!studentApp) {
          throw new ForbiddenException(
            'Under WAC 246-841A-440 (Req 11), you must complete the mandatory program orientation before accessing course theory units.',
          );
        }
      }
      // FR-04: Sequential unit unlock for HEALTH courses (scheduledOpenDate + previous unit quiz >= 80%)
      if (module.scheduledOpenDate && new Date(module.scheduledOpenDate) > new Date()) {
        throw new ForbiddenException(
          `Unit ${module.unitNumber || ''} is scheduled to open on ${module.scheduledOpenDate.toISOString().slice(0, 10)}.`,
        );
      }
      if (module.unitNumber && module.unitNumber > 1) {
        const prevPassed = await this.isPreviousUnitQuizPassed(
          courseId,
          module.unitNumber - 1,
          user.firebaseId,
        );
        if (!prevPassed) {
          throw new ForbiddenException(
            `Complete and pass Unit ${module.unitNumber - 1} Quiz (>= 80%) before unlocking Unit ${module.unitNumber}.`,
          );
        }
      }
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [lessons, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { moduleId },
        skip,
        take: pageSize,
        orderBy: { order: 'asc' },
        include: { contents: true, exercises: true },
      }),
      this.prisma.lesson.count({ where: { moduleId } }),
    ]);

    // CA-02: Strip correctAnswer from exercises for non-admin/non-instructor users
    const sanitizedLessons = lessons.map((lesson) => ({
      ...lesson,
      exercises: (isAdmin || isInstructor)
        ? lesson.exercises
        : lesson.exercises.map(stripExerciseAnswer),
    }));

    return {
      items: sanitizedLessons,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByInstructor(
    user: AuthenticatedUser,
    query: Record<string, any> = {},
  ) {
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

    const where: Record<string, any> = {
      module: {
        course: {
          instructorId: user.firebaseId,
        },
      },
    };

    if (query.moduleId) where.moduleId = Number(query.moduleId);
    if (query.type) where.type = query.type;

    const [lessons, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          module: {
            include: {
              course: {
                select: { id: true, title: true },
              },
            },
          },
        },
      }),
      this.prisma.lesson.count({ where }),
    ]);

    return {
      items: lessons,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { contents: true, module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // AUTHORIZATION: Same logic as findByModule
    const isInstructor = lesson.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';
    let isEnrolled = false;
    if (!isInstructor && !isAdmin) {
      // Check for direct course enrollment (no cohort)
      const directEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: user.firebaseId,
          courseId: lesson.module.courseId,
          cohortId: null, // Direct enrollment without cohort
        },
      });

      if (directEnrollment) {
        isEnrolled = true;
      } else {
        // Check for cohort-based enrollment
        const cohortEnrollment = await this.prisma.enrollment.findFirst({
          where: {
            userId: user.firebaseId,
            cohort: { courseId: lesson.module.courseId },
          },
        });
        isEnrolled = !!cohortEnrollment;
      }
    }

    if (!isInstructor && !isAdmin && !isEnrolled) {
      throw new ForbiddenException(
        'You must be enrolled in this course to view this lesson.',
      );
    }

    // We don't need to return the nested module/course info to the client
    const { module: _module, ...lessonWithoutNesting } = lesson;

    // Check if the lesson is locked for this user (if they are a student)
    let isLocked = false;
    if (academyProfile.role === 'STUDENT' || academyProfile.role === 'USER') {
      // CA-03: Check orientation & enrollment agreement prerequisites (HEALTH courses only)
      if (HealthCompliancePolicy.isHealthCourse(lesson.module.course)) {
        const orientationModule = await this.prisma.module.findFirst({
          where: { courseId: lesson.module.courseId, isOrientationModule: true },
        });
        const admissionsApp = await this.prisma.studentAdmissionsApplication.findFirst({
          where: { userId: user.firebaseId },
        });
        if (admissionsApp && !admissionsApp.agreementSigned) {
          isLocked = true;
        } else if (orientationModule && !lesson.module.isOrientationModule && (!admissionsApp || !admissionsApp.orientationCompleted)) {
          isLocked = true;
        } else if (lesson.module.scheduledOpenDate && new Date(lesson.module.scheduledOpenDate) > new Date()) {
          isLocked = true;
        } else if (lesson.module.unitNumber && lesson.module.unitNumber > 1) {
          const prevPassed = await this.isPreviousUnitQuizPassed(
            lesson.module.courseId,
            lesson.module.unitNumber - 1,
            user.firebaseId,
          );
          if (!prevPassed) {
            isLocked = true;
          }
        }
      }

      if (!isLocked && lesson.unlockRules) {
        const rules = lesson.unlockRules as any;
        if (rules.prerequisites && Array.isArray(rules.prerequisites)) {
          const prerequisiteLessonIds = rules.prerequisites
            .filter((pre: any) => pre.type === 'LESSON' && typeof pre.id === 'number')
            .map((pre: any) => pre.id);

          if (prerequisiteLessonIds.length > 0) {
            const completedPrerequisites = await this.prisma.progress.count({
              where: {
                userId: user.firebaseId,
                lessonId: { in: prerequisiteLessonIds },
                status: 'COMPLETED',
              },
            });

            if (completedPrerequisites < prerequisiteLessonIds.length) {
              isLocked = true;
            }
          }

          // CA-22: Unlock answer videos only after submitting referenced exercise
          const prerequisiteExerciseIds = rules.prerequisites
            .filter((pre: any) => pre.type === 'EXERCISE_SUBMISSION' && typeof pre.id === 'number')
            .map((pre: any) => pre.id);

          if (!isLocked && prerequisiteExerciseIds.length > 0) {
            const submittedCount = await this.prisma.exerciseSubmission.count({
              where: {
                userId: user.firebaseId,
                exerciseId: { in: prerequisiteExerciseIds },
              },
            });
            if (submittedCount < prerequisiteExerciseIds.length) {
              isLocked = true;
            }
          }
        }
      }
    }

    // Strict enforcement: Hide contents if locked
    const result = {
      ...lessonWithoutNesting,
      isLocked,
    };

    if (isLocked) {
      result.contents = [];
    }

    return result;
  }

  async update(id: number, dto: UpdateLessonDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const { dueDate, moduleId, contents, ...rest } = dto;

    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    const isInstructor = lesson.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to update this lesson.',
      );
    }

    if (lesson.module.course.isLocked) {
      throw new ForbiddenException(
        'This approved course version is locked. Create a new draft version to edit lessons.',
      );
    }

    const isHealth = HealthCompliancePolicy.isHealthCourse(lesson.module.course);

    return await this.prisma.lesson.update({
      where: { id },
      data: {
        ...rest,
        order: dto.order !== undefined ? dto.order : lesson.order,
        ...(dto.unlockRules !== undefined
          ? { unlockRules: dto.unlockRules ?? Prisma.JsonNull }
          : {}),
        ...(dueDate !== undefined
          ? { dueDate: dueDate ? new Date(dueDate) : null }
          : {}),
        ...(moduleId !== undefined
          ? { module: { connect: { id: moduleId } } }
          : {}),
        ...(contents && contents.length > 0
          ? {
              contents: {
                deleteMany: {},
                create: contents.map((c) => {
                  const { lessonId: _lessonId, ...rest } = c;
                  return {
                    ...rest,
                    ...(isHealth ? { isDownloadable: false, visibility: 'LOGGED_IN_ONLY' } : {}),
                  };
                }),
              },
            }
          : {}),
      },
    });
  }

  async remove(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    const isInstructor = lesson.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this lesson.',
      );
    }

    return await this.prisma.lesson.delete({ where: { id } });
  }

  // This method is now redundant since findOne and findByModule include contents.
  // But if you keep it, it needs the same security check.
  async getContentByLesson(lessonId: number, user: AuthenticatedUser) {
    const lesson = await this.findOne(lessonId, user); // Re-use the secure findOne logic
    return lesson.contents;
  }

  private async isPreviousUnitQuizPassed(
    courseId: number,
    prevUnitNumber: number,
    userId: string,
  ): Promise<boolean> {
    const prevModule = await this.prisma.module.findFirst({
      where: { courseId, unitNumber: prevUnitNumber },
      include: {
        exercises: {
          where: {
            OR: [{ isProctored: true }, { type: 'MULTIPLE_CHOICE' }],
          },
          select: { id: true, points: true, passingScorePercent: true },
        },
      },
    });
    if (!prevModule || prevModule.exercises.length === 0) {
      return true;
    }
    const quizIds = prevModule.exercises.map((e) => e.id);
    const submissions = await this.prisma.exerciseSubmission.findMany({
      where: { userId, exerciseId: { in: quizIds } },
    });
    return prevModule.exercises.some((ex) => {
      const sub = submissions.find((s) => s.exerciseId === ex.id);
      if (!sub) return false;
      const pct = ex.points > 0 ? (sub.score / ex.points) * 100 : 0;
      return pct >= (ex.passingScorePercent || 80);
    });
  }
}
