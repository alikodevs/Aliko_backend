import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { SubmitExerciseDto } from './dto/submit-exercise.dto';
import { GradeExerciseDto } from './dto/grade-exercise.dto';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { ExerciseType, SubmissionStatus } from '@prisma/client/academy';
import { ProgressAndAnalyticsService } from '../progress-and-analytics/progress-analytics.service';

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name);

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private progressService: ProgressAndAnalyticsService,
  ) {}

  async create(dto: CreateExerciseDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);

    // Validate Module ownership
    const module = await this.prisma.module.findUnique({
      where: { id: dto.moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');

    const isInstructor = module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to add exercises to this module.',
      );
    }

    return this.prisma.exercise.create({
      data: {
        ...dto,
      },
    });
  }

  async createBulk(dtos: CreateExerciseDto[], user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const isAdmin = academyProfile.role === 'ADMIN';

    // Group by moduleId to minimize lookups
    const moduleIds = [...new Set(dtos.map((d) => d.moduleId))];
    const modules = await this.prisma.module.findMany({
      where: { id: { in: moduleIds } },
      include: { course: true },
    });

    // Check permissions for all modules
    for (const moduleId of moduleIds) {
      const module = modules.find((m) => m.id === moduleId);
      if (!module) throw new NotFoundException(`Module ${moduleId} not found`);

      const isInstructor = module.course.instructorId === user.firebaseId;
      if (!isInstructor && !isAdmin) {
        throw new ForbiddenException(
          `You do not have permission to add exercises to module ${moduleId}.`,
        );
      }
    }

    // Use a transaction for bulk creation
    return this.prisma.$transaction(
      dtos.map((dto) =>
        this.prisma.exercise.create({
          data: { ...dto },
        }),
      ),
    );
  }

  async findAllByModule(
    moduleId: number,
    user: AuthenticatedUser,
    query: any = {},
  ) {
    await this.verifyModuleAccess(moduleId, user);

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [exercises, total] = await Promise.all([
      this.prisma.exercise.findMany({
        where: { moduleId },
        skip,
        take: pageSize,
        orderBy: { order: 'asc' },
      }),
      this.prisma.exercise.count({ where: { moduleId } }),
    ]);

    // Strip correct answers for students
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');

    const isInstructor = module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    let items = exercises;
    if (!isInstructor && !isAdmin) {
      items = exercises.map((ex) => {
        const { correctAnswer: _correctAnswer, ...rest } = ex;
        return rest;
      }) as any;
    }

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
      module: {
        course: {
          instructorId: user.firebaseId,
        },
      },
    };

    if (query.moduleId) where.moduleId = Number(query.moduleId);
    if (query.type) where.type = query.type;

    const [exercises, total] = await Promise.all([
      this.prisma.exercise.findMany({
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
      this.prisma.exercise.count({ where }),
    ]);

    return {
      items: exercises,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: {
        module: { include: { course: true } },
        lesson: true,
      },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');

    await this.verifyModuleAccess(exercise.moduleId, user);

    const academyProfile = await this.userService.getOrCreateProfile(user);
    const isInstructor =
      exercise.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    // Find requesting user's submission
    const submission = await this.prisma.exerciseSubmission.findUnique({
      where: {
        userId_exerciseId: {
          userId: user.firebaseId,
          exerciseId: id,
        },
      },
    });

    if (!isInstructor && !isAdmin) {
      const { correctAnswer: _correctAnswer, ...rest } = exercise;
      return {
        ...rest,
        mySubmission: submission,
      };
    }

    return {
      ...exercise,
      mySubmission: submission,
    };
  }

  async update(id: number, dto: UpdateExerciseDto, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');

    const academyProfile = await this.userService.getOrCreateProfile(user);
    const isInstructor =
      exercise.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to update this exercise.',
      );
    }

    return this.prisma.exercise.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');

    const academyProfile = await this.userService.getOrCreateProfile(user);
    const isInstructor =
      exercise.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this exercise.',
      );
    }

    return this.prisma.exercise.delete({ where: { id } });
  }

  async submit(id: number, dto: SubmitExerciseDto, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');

    await this.verifyModuleAccess(exercise.moduleId, user);

    let isCorrect = false;
    let score = 0;
    let status: SubmissionStatus = SubmissionStatus.GRADED;

    // Auto-grading logic
    if (
      exercise.type === ExerciseType.MULTIPLE_CHOICE ||
      exercise.type === ExerciseType.TRUE_FALSE
    ) {
      // Comparison might differ based on data types (string vs object). Assuming simple equality for now.
      isCorrect = dto.answer === exercise.correctAnswer;
      score = isCorrect ? exercise.points : 0;
    } else if (exercise.type === ExerciseType.MATCHING) {
      // Logic for matching: Check if all pairs match
      // answer: [{"left": "A", "right": "1"}, ...]
      // correctAnswer: [{"left": "A", "right": "1"}, ...]
      const answerPairs = Array.isArray(dto.answer) ? dto.answer : [];
      const correctPairs = Array.isArray(exercise.correctAnswer)
        ? exercise.correctAnswer
        : [];

      // Simple check: stringify and compare sorted or use validation util
      // For now, strict JSON equality
      if (JSON.stringify(answerPairs) === JSON.stringify(correctPairs)) {
        isCorrect = true;
        score = exercise.points;
      }
    } else if (exercise.type === ExerciseType.SHORT_TEXT) {
      status = SubmissionStatus.PENDING_REVIEW;
      score = 0; // To be determined
    }

    // Save submission
    // We use upsert to allow re-submission or we can block strict re-submissions
    // Prompt didn't specify, so Upserting (taking latest) seems user-friendly for "Practice"
    const submission = await this.prisma.exerciseSubmission.upsert({
      where: {
        userId_exerciseId: {
          userId: user.firebaseId,
          exerciseId: id,
        },
      },
      update: {
        answer: dto.answer,
        isCorrect,
        score,
        status,
        updatedAt: new Date(),
        attemptCount: { increment: 1 },
      },
      create: {
        userId: user.firebaseId,
        exerciseId: id,
        answer: dto.answer,
        isCorrect,
        score,
        status,
      },
    });

    if (isCorrect && status === SubmissionStatus.GRADED) {
      if (exercise.lessonId) {
        await this.progressService.checkAndAutoCompleteLesson(
          user,
          exercise.module.courseId,
          exercise.lessonId,
        );
      }
    }

    // WABON WAC 246-841A-440 (Req 12): Week 1 Academic Assignment Attendance Verification
    if (exercise.isWeekOneAttendanceGate) {
      await this.prisma.enrollment.updateMany({
        where: {
          userId: user.firebaseId,
          courseId: exercise.module.courseId,
        },
        data: {
          attendanceStatus: 'VERIFIED_PRESENT',
          attendanceVerifiedAt: new Date(),
        },
      });
      this.logger.log(
        `Student ${user.firebaseId} verified attendance via Week 1 Academic Gate (Exercise ${id})`,
      );
    }

    return submission;
  }

  async grade(
    submissionId: number,
    dto: GradeExerciseDto,
    user: AuthenticatedUser,
  ) {
    const submission = await this.prisma.exerciseSubmission.findUnique({
      where: { id: submissionId },
      include: {
        exercise: { include: { module: { include: { course: true } } } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const academyProfile = await this.userService.getOrCreateProfile(user);
    const isInstructor =
      submission.exercise.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to grade this exercise.',
      );
    }

    const updatedSubmission = await this.prisma.exerciseSubmission.update({
      where: { id: submissionId },
      data: {
        isCorrect: dto.isCorrect,
        score: dto.score,
        feedback: dto.feedback,
        status: SubmissionStatus.GRADED,
      },
      include: {
        exercise: { include: { module: true } },
      },
    });

    // WABON Req 15: Early Warning and Remediation for scores < 80%
    const totalPoints = submission.exercise.points || 1;
    const scorePercentage = (dto.score / totalPoints) * 100;
    if (scorePercentage < 80) {
      await this.prisma.studentRemediation.create({
        data: {
          userId: submission.userId,
          courseId: submission.exercise.module.courseId,
          exerciseId: submission.exerciseId,
          initialScore: dto.score,
          instructorId: user.firebaseId,
          actionPlan: 'Instructor individualized review and revision recommended.',
          feedback: dto.feedback || 'Score below 80% passing threshold under WAC standards.',
          status: 'REQUIRED',
        },
      });
      this.logger.warn(
        `Remediation record created for student ${submission.userId} in course ${submission.exercise.module.courseId} (Score: ${scorePercentage}%)`,
      );
    }

    if (dto.isCorrect && updatedSubmission.exercise.lessonId) {
      // We need to fetch the target user since 'user' here is the instructor
      const targetUser = await this.userService.getUserById(
        updatedSubmission.userId,
      );
      if (targetUser) {
        await this.progressService.checkAndAutoCompleteLesson(
          targetUser,
          updatedSubmission.exercise.module.courseId,
          updatedSubmission.exercise.lessonId,
        );
      }
    }

    return updatedSubmission;
  }

  async findSubmissionsForInstructor(user: AuthenticatedUser, query: any = {}) {
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
      exercise: {
        module: {
          course: {
            instructorId: user.firebaseId,
          },
        },
      },
    };

    if (query.status) where.status = query.status;
    if (query.courseId) where.exercise = { module: { courseId: Number(query.courseId) } };
    if (query.exerciseId) where.exerciseId = Number(query.exerciseId);

    const [submissions, total] = await Promise.all([
      this.prisma.exerciseSubmission.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          exercise: {
            include: {
              module: {
                include: {
                  course: {
                    select: { id: true, title: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.exerciseSubmission.count({ where }),
    ]);

    // Enrich with user data
    const userIds = [...new Set(submissions.map((s) => s.userId))];
    if (userIds.length === 0) {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }
    const users = await this.userService.getUsersByIds(userIds);

    const items = submissions.map((submission) => ({
      ...submission,
      user: users.find((u) => u.firebaseId === submission.userId) || null,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Helper to verify student access
  private async verifyModuleAccess(moduleId: number, user: AuthenticatedUser) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');

    const academyProfile = await this.userService.getOrCreateProfile(user);
    const isInstructor = module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (isInstructor || isAdmin) return;

    // Check enrollment
    const directEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.firebaseId,
        courseId: module.courseId,
        cohortId: null,
        status: 'ACTIVE',
      },
    });

    const cohortEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.firebaseId,
        cohort: { courseId: module.courseId },
        status: 'ACTIVE',
      },
    });

    if (!directEnrollment && !cohortEnrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to access exercises.',
      );
    }
  }
}
