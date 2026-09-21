import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { SubmissionStatus } from '../generated/client';

function assertUser(
  user?: AuthenticatedUser,
): asserts user is AuthenticatedUser {
  if (!user) {
    throw new ForbiddenException('Authentication required');
  }
}

@Injectable()
export class ProgressAndAnalyticsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private userService: UserService,
  ) {}

  // --- Get instructor stats ---
  async getInstructorStats(user: AuthenticatedUser | undefined) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Only instructors and admins can view instructor stats.',
      );
    }

    // Get courses taught by this instructor
    const courses = await this.prisma.course.findMany({
      where: { instructorId: user.firebaseId },
    });

    // Get total enrollments across all courses (both direct and cohort-based)
    const courseIds = courses.map((course) => course.id);
    const totalEnrollments =
      courseIds.length > 0
        ? await this.prisma.enrollment.count({
            where: {
              OR: [
                { courseId: { in: courseIds } },
                { cohort: { courseId: { in: courseIds } } },
              ],
            },
          })
        : 0;

    // Get average rating (this is a simplified approach)
    const totalRating = courses.reduce(
      (sum, course) => sum + (course.rating || 0),
      0,
    );
    const averageRating = courses.length > 0 ? totalRating / courses.length : 0;

    return {
      totalCourses: courses.length,
      totalStudents: totalEnrollments,
      averageRating: parseFloat(averageRating.toFixed(1)),
      yearsOfExperience: 10, // This would come from the user profile in a real implementation
    };
  }

  // --- Get a specific user's progress ---
  async getUserProgress(
    requestingUser: AuthenticatedUser | undefined,
    targetUserId: string,
    courseId: number,
  ) {
    assertUser(requestingUser);

    const academyProfile =
      await this.userService.getOrCreateProfile(requestingUser);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (
      (academyProfile.role === 'STUDENT' || academyProfile.role === 'USER') &&
      requestingUser.firebaseId !== targetUserId
    ) {
      throw new ForbiddenException(
        'Students can only view their own progress.',
      );
    }

    if (
      academyProfile.role === 'INSTRUCTOR' &&
      course.instructorId !== requestingUser.firebaseId
    ) {
      throw new ForbiddenException(
        'Instructors can only view their own courses.',
      );
    }

    return this.prisma.progress.findMany({
      where: { userId: targetUserId, courseId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // --- Update enrollment progress ---
  async updateEnrollmentProgress(
    userId: string,
    courseId: number,
    percentage: number,
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        OR: [{ courseId }, { cohort: { courseId } }],
      },
    });

    if (enrollment) {
      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { progress: percentage },
      });
    }
  }

  // --- Get course analytics ---
  async getCourseAnalytics(
    courseId: number,
    user: AuthenticatedUser | undefined,
  ) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (academyProfile.role === 'STUDENT')
      throw new ForbiddenException('Students cannot view course analytics.');
    if (
      academyProfile.role === 'INSTRUCTOR' &&
      course.instructorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'Instructors can only view analytics for their own courses.',
      );
    }

    const progress = await this.prisma.progress.findMany({
      where: { courseId },
    });
    const completed = progress.filter((p) => p.status === 'COMPLETED').length;

    return {
      totalProgressEntries: progress.length,
      completed,
      inProgress: progress.length - completed,
    };
  }

  // --- Complete a lesson ---
  async completeLesson(
    user: AuthenticatedUser | undefined,
    courseId: number,
    lessonId: number,
  ) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (
      academyProfile.role !== 'STUDENT' &&
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN' &&
      academyProfile.role !== 'USER'
    ) {
      throw new ForbiddenException('Only students and instructors can complete lessons.');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.firebaseId,
        OR: [{ courseId }, { cohort: { courseId } }],
      },
    });
    if (!enrollment)
      throw new ForbiddenException('Not enrolled in this course.');

    const existing = await this.prisma.progress.findFirst({
      where: { userId: user.firebaseId, courseId, lessonId, contentId: null },
    });
    if (existing) return existing;

    const progress = await this.prisma.progress.create({
      data: {
        userId: user.firebaseId,
        courseId,
        lessonId,
        status: 'COMPLETED',
      },
    });

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (lesson) {
      await this.notificationsService.notifyInstructorProgress(
        user.firebaseId,
        courseId,
        lesson.module.title,
      );
    }

    // Update enrollment progress percentage
    const courseProgress = await this.getStudentCourseProgress(
      user.firebaseId,
      courseId,
    );
    await this.updateEnrollmentProgress(
      user.firebaseId,
      courseId,
      courseProgress.percentage,
    );

    return progress;
  }

  // --- Get lesson completion status ---
  async getLessonStatus(
    user: AuthenticatedUser | undefined,
    courseId: number,
    lessonId: number,
  ) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (
      academyProfile.role !== 'STUDENT' &&
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN' &&
      academyProfile.role !== 'USER'
    ) {
      throw new ForbiddenException('Access denied.');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.firebaseId,
        OR: [{ courseId }, { cohort: { courseId } }],
      },
    });
    if (!enrollment)
      throw new ForbiddenException('Not enrolled in this course.');

    const existing = await this.prisma.progress.findFirst({
      where: { userId: user.firebaseId, courseId, lessonId, contentId: null },
    });

    return {
      completed: !!existing,
      progress: existing || null,
    };
  }

  // --- Get student's progress in a course ---
  async getStudentCourseProgress(userId: string, courseId: number) {
    const lessons = await this.prisma.lesson.findMany({
      where: { module: { courseId } },
      select: { id: true },
    });

    const completed = await this.prisma.progress.count({
      where: {
        userId,
        courseId,
        lessonId: { not: null },
        contentId: null, // Only count lesson completion entries
        status: 'COMPLETED',
      },
    });

    const percentage =
      lessons.length > 0 ? (completed / lessons.length) * 100 : 0;
    return { totalLessons: lessons.length, completed, percentage };
  }

  // --- Get dashboard for a student ---
  async getStudentDashboard(user: AuthenticatedUser | undefined) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (academyProfile.role !== 'STUDENT' && academyProfile.role !== 'USER') {
      throw new ForbiddenException('Only students have dashboards.');
    }

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

    return Promise.all(
      enrollments.map(async (e) => {
        // Determine which course to use
        const course = e.cohort ? e.cohort.course : e.course;

        const progress = await this.getStudentCourseProgress(
          user.firebaseId,
          course.id,
        );
        return {
          course: course.title,
          courseId: course.id,
          ...progress,
        };
      }),
    );
  }

  async getRecommendedNextLesson(user: AuthenticatedUser, courseId: number) {
    // 1. Find all lessons in the course
    const lessons = await this.prisma.lesson.findMany({
      where: { module: { courseId } },
      orderBy: [{ module: { id: 'asc' } }, { order: 'asc' }],
    });

    if (lessons.length === 0) return null;

    // 2. Find completed lessons
    const completedProgress = await this.prisma.progress.findMany({
      where: {
        userId: user.firebaseId,
        courseId,
        lessonId: { not: null },
        status: 'COMPLETED',
      },
      select: { lessonId: true },
    });

    const completedLessonIds = new Set(completedProgress.map((p) => p.lessonId));

    // 3. Find the first lesson that is NOT completed
    const nextLesson = lessons.find((l) => !completedLessonIds.has(l.id));

    return nextLesson || lessons[lessons.length - 1]; // Return first uncompleted or the last one if all done
  }

  // --- Get progress of all students for a course ---
  async getStudentsProgressForCourse(
    user: AuthenticatedUser | undefined,
    courseId: number,
  ) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (academyProfile.role === 'STUDENT')
      throw new ForbiddenException('Access denied');
    if (
      academyProfile.role === 'INSTRUCTOR' &&
      course.instructorId !== user.firebaseId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { OR: [{ courseId }, { cohort: { courseId } }] },
    });
    const studentIds = enrollments.map((e) => e.userId);
    const students = await this.userService.getUsersByIds(studentIds);

    return Promise.all(
      students.map(async (student) => {
        const progress = await this.getStudentCourseProgress(
          student.firebaseId,
          courseId,
        );
        return {
          student: {
            id: student.firebaseId,
            name: `${student.firstname} ${student.lastname}`.trim(),
          },
          ...progress,
        };
      }),
    );
  }

  // --- Get overall platform analytics (ADMIN only) ---
  async getOverallPlatformAnalytics(user: AuthenticatedUser | undefined) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);
    console.log('Resolved academy profile:', academyProfile);

    if (academyProfile.role !== 'ADMIN') {
      throw new ForbiddenException('Admins only');
    }

    const [totalCourses, totalProgress, totalEnrollments] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.progress.count(),
      this.prisma.enrollment.count(),
    ]);

    return { totalCourses, totalProgress, totalEnrollments };
  }

  // --- NEW: Update progress for a specific content item ---
  async updateContentProgress(
    user: AuthenticatedUser | undefined,
    courseId: number,
    moduleId: number,
    lessonId: number,
    contentId: number,
    status: string,
    score?: number,
  ) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (
      academyProfile.role !== 'STUDENT' &&
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN' &&
      academyProfile.role !== 'USER'
    ) {
      throw new ForbiddenException('Only students and instructors can update their progress.');
    }

    // Check if student is enrolled in the course (either directly or through a cohort)
    const directEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.firebaseId,
        courseId: courseId,
        cohortId: null, // Direct enrollment without cohort
      },
    });

    let isEnrolled = !!directEnrollment;

    if (!isEnrolled) {
      // Check for cohort-based enrollment
      const cohortEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: user.firebaseId,
          cohort: { courseId: courseId },
        },
      });
      isEnrolled = !!cohortEnrollment;
    }

    if (!isEnrolled)
      throw new ForbiddenException('Not enrolled in this course.');

    // Check if content exists
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });
    if (!content) throw new NotFoundException('Content not found');

    // Find existing progress or create new
    let progress = await this.prisma.progress.findFirst({
      where: {
        userId: user.firebaseId,
        contentId: contentId,
      },
    });

    if (progress) {
      // Update existing progress
      progress = await this.prisma.progress.update({
        where: { id: progress.id },
        data: {
          status,
          score,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new progress record
      progress = await this.prisma.progress.create({
        data: {
          userId: user.firebaseId,
          courseId,
          moduleId,
          lessonId,
          contentId,
          status,
          score,
        },
      });
    }

    if (status === 'COMPLETED') {
      await this.checkAndAutoCompleteLesson(user, courseId, lessonId);
    }

    return progress;
  }

  async checkAndAutoCompleteLesson(
    user: AuthenticatedUser,
    courseId: number,
    lessonId: number,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        contents: true,
        exercises: true,
      },
    });

    if (!lesson) return;

    // 1. Check if all contents are completed
    const contentIds = lesson.contents.map((c) => c.id);
    if (contentIds.length > 0) {
      const completedContentsCount = await this.prisma.progress.count({
        where: {
          userId: user.firebaseId,
          contentId: { in: contentIds },
          status: 'COMPLETED',
        },
      });
      if (completedContentsCount < contentIds.length) return;
    }

    // 2. Check if all auto-graded exercises are passed
    const exerciseIds = lesson.exercises.map((e) => e.id);
    if (exerciseIds.length > 0) {
      const passedExercisesCount = await this.prisma.exerciseSubmission.count({
        where: {
          userId: user.firebaseId,
          exerciseId: { in: exerciseIds },
          status: SubmissionStatus.GRADED,
          isCorrect: true,
        },
      });
      if (passedExercisesCount < exerciseIds.length) return;
    }

    // All requirements met -> Auto-complete the lesson
    try {
      await this.completeLesson(user, courseId, lessonId);
    } catch (error) {
      // Ignore if already completed or other issues (best effort auto-complete)
    }
  }

  // --- NEW: Get detailed progress for a student in a course ---
  async getDetailedStudentProgress(
    user: AuthenticatedUser | undefined,
    targetUserId: string,
    courseId: number,
  ) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    // Authorization checks
    if (
      (academyProfile.role === 'STUDENT' || academyProfile.role === 'USER') &&
      user.firebaseId !== targetUserId
    ) {
      throw new ForbiddenException(
        'Students can only view their own progress.',
      );
    }

    if (
      academyProfile.role === 'INSTRUCTOR' &&
      course.instructorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'Instructors can only view progress for their own courses.',
      );
    }

    // Get all modules and lessons for the course
    const modules = await this.prisma.module.findMany({
      where: { courseId },
      include: {
        lessons: {
          include: {
            contents: true,
            exercises: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get student's progress
    const [progressRecords, exerciseSubmissions] = await Promise.all([
      this.prisma.progress.findMany({
        where: {
          userId: targetUserId,
          courseId,
        },
      }),
      this.prisma.exerciseSubmission.findMany({
        where: {
          userId: targetUserId,
          exercise: { module: { courseId } },
        },
      }),
    ]);

    // Calculate progress for each module
    const moduleProgress = await Promise.all(
      modules.map(async (module) => {
        const lessonProgress = await Promise.all(
          module.lessons.map(async (lesson) => {
            const contentProgress = lesson.contents.map((content) => {
              const progress = progressRecords.find(
                (p) => p.lessonId === lesson.id && p.contentId === content.id,
              );
              return {
                contentId: content.id,
                contentTitle: content.title,
                contentType: content.type,
                status: progress?.status || 'NOT_STARTED',
                score: progress?.score,
              };
            });

            const exerciseProgress = lesson.exercises.map((exercise) => {
              const submission = exerciseSubmissions.find(
                (s) => s.exerciseId === exercise.id,
              );
              return {
                exerciseId: exercise.id,
                exerciseTitle: exercise.title,
                exerciseType: exercise.type,
                status: submission?.status || 'NOT_STARTED',
                score: submission?.score,
                isCorrect: submission?.isCorrect,
                feedback: submission?.feedback,
              };
            });

            // Calculate lesson completion
            const completedContents = contentProgress.filter(
              (c) => c.status === 'COMPLETED',
            ).length;

            const passedExercises = exerciseProgress.filter(
              (e) => e.status === 'GRADED' && e.isCorrect,
            ).length;

            const isLessonCompleted =
              completedContents === contentProgress.length &&
              passedExercises === exerciseProgress.length;

            const lessonStatus = isLessonCompleted
              ? 'COMPLETED'
              : completedContents > 0 || passedExercises > 0
                ? 'IN_PROGRESS'
                : 'NOT_STARTED';

            return {
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              status: lessonStatus,
              contents: contentProgress,
              exercises: exerciseProgress,
            };
          }),
        );

        // Calculate module completion
        const completedLessons = lessonProgress.filter(
          (l) => l.status === 'COMPLETED',
        ).length;
        const moduleStatus =
          completedLessons === lessonProgress.length
            ? 'COMPLETED'
            : completedLessons > 0
              ? 'IN_PROGRESS'
              : 'NOT_STARTED';

        return {
          moduleId: module.id,
          moduleTitle: module.title,
          status: moduleStatus,
          lessons: lessonProgress,
        };
      }),
    );

    return moduleProgress;
  }

  // --- NEW: Get instructor dashboard with detailed analytics ---
  async getInstructorDashboard(user: AuthenticatedUser | undefined) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (
      academyProfile.role !== 'INSTRUCTOR' &&
      academyProfile.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Only instructors and admins have dashboards.',
      );
    }

    // Get courses taught by this instructor
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
      },
    });

    // Get detailed analytics for each course
    const courseAnalytics = await Promise.all(
      courses.map(async (course) => {
        // Get enrollments
        const enrollments = await this.prisma.enrollment.count({
          where: { cohort: { courseId: course.id } },
        });

        // Get average progress
        const progressRecords = await this.prisma.progress.findMany({
          where: { courseId: course.id },
        });

        // Calculate average completion
        const totalContents = course.modules.reduce(
          (sum, module) =>
            sum +
            module.lessons.reduce(
              (lessonSum, lesson) => lessonSum + lesson.contents.length,
              0,
            ),
          0,
        );

        const completedContents = progressRecords.filter(
          (p) => p.status === 'COMPLETED',
        ).length;

        const averageProgress =
          totalContents > 0 ? (completedContents / totalContents) * 100 : 0;

        return {
          courseId: course.id,
          courseTitle: course.title,
          totalEnrollments: enrollments,
          averageProgress: parseFloat(averageProgress.toFixed(1)),
          modulesCount: course.modules.length,
        };
      }),
    );

    return {
      totalCourses: courses.length,
      courseAnalytics,
    };
  }

  // --- NEW: Get student stats for sidebar ---
  async getStudentStats(user: AuthenticatedUser | undefined) {
    assertUser(user);

    const academyProfile = await this.userService.getOrCreateProfile(user);

    if (academyProfile.role !== 'STUDENT' && academyProfile.role !== 'USER') {
      throw new ForbiddenException('Only students can view these stats.');
    }

    // Get counts for different types of progress
    const [
      conceptsViewed,
      lessonsViewed,
      quizzesCompleted,
      projectsPassed,
      programsCompleted,
    ] = await Promise.all([
      this.prisma.progress.count({
        where: {
          userId: user.firebaseId,
          content: { type: 'PDF' }, // Assuming PDFs are concepts
        },
      }),
      this.prisma.progress.count({
        where: {
          userId: user.firebaseId,
          lessonId: { not: null },
          contentId: null,
          status: 'COMPLETED',
        },
      }),
      this.prisma.progress.count({
        where: {
          userId: user.firebaseId,
          content: { type: 'QUIZ' },
          status: 'COMPLETED',
        },
      }),
      this.prisma.progress.count({
        where: {
          userId: user.firebaseId,
          content: { type: 'ASSIGNMENT' },
          status: 'COMPLETED',
        },
      }),
      0, // Programs completed - would need to be implemented based on specific criteria
    ]);

    return {
      conceptsViewed,
      lessonsViewed,
      quizzesCompleted,
      projectsPassed,
      programsCompleted,
    };
  }
}
