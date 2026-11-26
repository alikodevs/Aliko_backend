import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { RubricsService } from '../rubrics/rubrics.service';
import {
  CreateDiscussionTopicDto,
  UpdateDiscussionTopicDto,
  CreateDiscussionPostDto,
  GradeDiscussionPostDto,
} from './dto';

@Injectable()
export class DiscussionsService {
  private readonly logger = new Logger(DiscussionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly rubricsService: RubricsService,
  ) {}

  async createTopic(dto: CreateDiscussionTopicDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const moduleItem = await this.prisma.module.findUnique({
      where: { id: dto.moduleId },
      include: { course: true },
    });
    if (!moduleItem) throw new NotFoundException('Module not found');

    const isInstructor = moduleItem.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'Only instructors or admins can create discussion topics.',
      );
    }

    let resolvedRubricId: string | null = dto.rubricId || null;
    let calculatedMaxPoints = dto.maxPoints ?? 10;

    // Attach existing rubric or create new inline rubric
    if (dto.rubricId) {
      const existingRubric = await this.rubricsService.findOne(dto.rubricId);
      if (existingRubric && existingRubric.criteria && existingRubric.criteria.length > 0) {
        if (!dto.maxPoints || dto.maxPoints === 10) {
          calculatedMaxPoints = existingRubric.criteria.reduce(
            (acc, c) => acc + (c.maxPoints || 0),
            0,
          );
        }
      }
    } else if (dto.rubric && typeof dto.rubric === 'object' && dto.rubric.criteria) {
      const createdRubric = await this.rubricsService.create(user.firebaseId, {
        ...dto.rubric,
        type: 'DISCUSSION',
      });
      resolvedRubricId = createdRubric.id;
      if (createdRubric.criteria && createdRubric.criteria.length > 0) {
        calculatedMaxPoints = createdRubric.criteria.reduce(
          (acc, c) => acc + (c.maxPoints || 0),
          0,
        );
      }
    }

    const topic = await this.prisma.discussionTopic.create({
      data: {
        moduleId: dto.moduleId,
        title: dto.title,
        prompt: dto.prompt,
        rubricId: resolvedRubricId,
        rubric: dto.rubric ?? undefined,
        maxPoints: calculatedMaxPoints,
        dueDate: dto.dueDate
          ? new Date(dto.dueDate)
          : (dto as any).dueAt
          ? new Date((dto as any).dueAt)
          : null,
        isWeekOneAttendanceGate: dto.isWeekOneAttendanceGate ?? false,
        courseOutcome: dto.courseOutcome ?? null,
        postFirst: (dto as any).postFirst ?? true,
        minReplies: (dto as any).minReplies ?? 2,
      },
      include: {
        rubricRef: {
          include: {
            criteria: {
              orderBy: { order: 'asc' },
              include: {
                levels: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Created discussion topic ${topic.id} in module ${dto.moduleId} with rubric ${resolvedRubricId}`,
    );
    return topic;
  }

  async updateTopic(
    topicId: number,
    dto: UpdateDiscussionTopicDto,
    user: AuthenticatedUser,
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      include: {
        module: {
          include: { course: true },
        },
      },
    });
    if (!topic) throw new NotFoundException('Discussion topic not found');

    const isInstructor =
      topic.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'Only instructors or admins can edit discussion topics.',
      );
    }

    let resolvedRubricId = topic.rubricId;
    let calculatedMaxPoints = dto.maxPoints ?? topic.maxPoints;

    if (dto.rubricId !== undefined) {
      resolvedRubricId = dto.rubricId;
      if (dto.rubricId) {
        const existingRubric = await this.rubricsService.findOne(dto.rubricId);
        if (existingRubric && existingRubric.criteria && existingRubric.criteria.length > 0) {
          if (!dto.maxPoints) {
            calculatedMaxPoints = existingRubric.criteria.reduce(
              (acc, c) => acc + (c.maxPoints || 0),
              0,
            );
          }
        }
      }
    } else if (dto.rubric && typeof dto.rubric === 'object' && dto.rubric.criteria) {
      const createdRubric = await this.rubricsService.create(user.firebaseId, {
        ...dto.rubric,
        type: 'DISCUSSION',
      });
      resolvedRubricId = createdRubric.id;
      if (createdRubric.criteria && createdRubric.criteria.length > 0) {
        calculatedMaxPoints = createdRubric.criteria.reduce(
          (acc, c) => acc + (c.maxPoints || 0),
          0,
        );
      }
    }

    const updated = await this.prisma.discussionTopic.update({
      where: { id: topicId },
      data: {
        title: dto.title ?? topic.title,
        prompt: dto.prompt ?? topic.prompt,
        rubricId: resolvedRubricId,
        rubric: dto.rubric ?? topic.rubric,
        maxPoints: calculatedMaxPoints,
        dueDate: dto.dueDate
          ? new Date(dto.dueDate)
          : (dto as any).dueAt
          ? new Date((dto as any).dueAt)
          : topic.dueDate,
        isWeekOneAttendanceGate:
          dto.isWeekOneAttendanceGate !== undefined
            ? dto.isWeekOneAttendanceGate
            : topic.isWeekOneAttendanceGate,
        courseOutcome:
          dto.courseOutcome !== undefined
            ? dto.courseOutcome
            : topic.courseOutcome,
      },
      include: {
        rubricRef: {
          include: {
            criteria: {
              orderBy: { order: 'asc' },
              include: {
                levels: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Updated discussion topic ${topicId} with rubric ${resolvedRubricId}`,
    );
    return updated;
  }

  async findAllByModule(moduleId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);
    const moduleItem = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });
    if (!moduleItem) throw new NotFoundException('Module not found');

    return this.prisma.discussionTopic.findMany({
      where: { moduleId },
      include: {
        rubricRef: {
          include: {
            criteria: {
              orderBy: { order: 'asc' },
              include: {
                levels: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTopicWithPosts(topicId: number, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      include: {
        module: {
          select: { id: true, title: true, courseId: true, course: { select: { instructorId: true } } },
        },
        rubricRef: {
          include: {
            criteria: {
              orderBy: { order: 'asc' },
              include: {
                levels: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        posts: {
          where: { parentId: null }, // Fetch root posts
          include: {
            profile: {
              select: { userId: true, role: true, specialization: true },
            },
            grade: true,
            replies: {
              include: {
                profile: {
                  select: { userId: true, role: true, specialization: true },
                },
                grade: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!topic) throw new NotFoundException('Discussion topic not found');

    const isStaff =
      ['INSTRUCTOR', 'ADMIN', 'COURSE_MANAGER', 'COMMISSION_AUDITOR'].includes(profile.role) ||
      topic.module?.course?.instructorId === user.firebaseId;

    const studentRootPosts = topic.posts.filter((p) => p.userId === user.firebaseId);
    const studentReplyCount = topic.posts.reduce(
      (sum, root) => sum + root.replies.filter((r) => r.userId === user.firebaseId).length,
      0,
    );

    const lockedUntilFirstPost =
      !isStaff && Boolean(topic.postFirst) && studentRootPosts.length === 0;

    return {
      ...topic,
      posts: lockedUntilFirstPost ? [] : topic.posts,
      lockedUntilFirstPost,
      studentRootPostCount: studentRootPosts.length,
      studentReplyCount,
      minReplies: topic.minReplies ?? 2,
      repliesRemaining: Math.max(0, (topic.minReplies ?? 2) - studentReplyCount),
    };
  }

  async createPost(dto: CreateDiscussionPostDto, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: dto.topicId },
      include: { module: true },
    });
    if (!topic) throw new NotFoundException('Discussion topic not found');

    // If parentId provided, verify parent exists within same topic
    if (dto.parentId) {
      const parent = await this.prisma.discussionPost.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.topicId !== dto.topicId) {
        throw new NotFoundException('Parent discussion post not found in this topic');
      }
    }

    const post = await this.prisma.discussionPost.create({
      data: {
        topicId: dto.topicId,
        userId: user.firebaseId,
        body: dto.body,
        parentId: dto.parentId || null,
      },
      include: {
        profile: {
          select: { userId: true, role: true },
        },
      },
    });

    // WABON WAC 246-841A-440 (Req 12): Week 1 Attendance Gate verification via discussion post
    if (topic.isWeekOneAttendanceGate) {
      await this.prisma.enrollment.updateMany({
        where: {
          userId: user.firebaseId,
          courseId: topic.module.courseId,
        },
        data: {
          attendanceStatus: 'VERIFIED_PRESENT',
          attendanceVerifiedAt: new Date(),
          attendanceVerifiedBy: `AUTO_DISCUSSION_${topic.id}`,
          attendanceNotes: `Verified via Week 1 Attendance Gate Discussion: "${topic.title}" (Course Outcome: ${topic.courseOutcome || 'N/A'})`,
        },
      });
      this.logger.log(
        `Student ${user.firebaseId} verified attendance via Week 1 Discussion Gate (Topic ${topic.id})`,
      );
    }

    this.logger.log(`Created discussion post ${post.id} by user ${user.firebaseId}`);
    return post;
  }

  async gradePost(
    postId: number,
    dto: GradeDiscussionPostDto,
    user: AuthenticatedUser,
  ) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const post = await this.prisma.discussionPost.findUnique({
      where: { id: postId },
      include: {
        topic: {
          include: {
            module: {
              include: { course: true },
            },
            rubricRef: true,
          },
        },
      },
    });

    if (!post) throw new NotFoundException('Discussion post not found');

    const isInstructor =
      post.topic.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException('Only instructors or admins can grade discussion posts');
    }

    let finalScore = dto.score ?? dto.grade ?? 0;
    let rubricBreakdown = dto.rubricScores || null;

    // Execute Rubric Evaluation if rubric selection or criteria scores provided
    const targetRubricId = dto.rubricId || post.topic.rubricId;
    if (
      targetRubricId &&
      ((dto.selectedLevelIds && dto.selectedLevelIds.length > 0) ||
        (dto.criteriaScores && dto.criteriaScores.length > 0))
    ) {
      const evaluation = await this.rubricsService.evaluateWithRubric({
        rubricId: targetRubricId,
        selectedLevelIds: dto.selectedLevelIds,
        criteriaScores: dto.criteriaScores,
        customFeedback: dto.feedback,
      });
      finalScore = evaluation.totalEarnedPoints;
      rubricBreakdown = evaluation.criteriaEvaluations;
    }

    const grade = await this.prisma.discussionGrade.upsert({
      where: { postId },
      update: {
        score: finalScore,
        rubricScores: rubricBreakdown,
        feedback: dto.feedback,
        graderId: user.firebaseId,
      },
      create: {
        postId,
        score: finalScore,
        rubricScores: rubricBreakdown,
        feedback: dto.feedback,
        graderId: user.firebaseId,
      },
    });

    this.logger.log(
      `Graded discussion post ${postId} with score ${finalScore} by grader ${user.firebaseId}`,
    );

    // WABON Req 12: Week 1 Attendance Gate verification via discussion post grading
    if (post.topic.isWeekOneAttendanceGate) {
      await this.prisma.enrollment.updateMany({
        where: {
          userId: post.userId,
          courseId: post.topic.module.courseId,
        },
        data: {
          attendanceStatus: 'VERIFIED_PRESENT',
          attendanceVerifiedAt: new Date(),
          attendanceVerifiedBy: `INSTRUCTOR_GRADE_${user.firebaseId}`,
          attendanceNotes: `Verified via Instructor grading on Week 1 Discussion Gate: "${post.topic.title}" (Score: ${finalScore})`,
        },
      });
    }

    return grade;
  }
}
