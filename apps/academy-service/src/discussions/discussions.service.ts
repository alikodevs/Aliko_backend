import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import {
  CreateDiscussionTopicDto,
  CreateDiscussionPostDto,
  GradeDiscussionPostDto,
} from './dto';

@Injectable()
export class DiscussionsService {
  private readonly logger = new Logger(DiscussionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
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

    const topic = await this.prisma.discussionTopic.create({
      data: {
        moduleId: dto.moduleId,
        title: dto.title,
        prompt: dto.prompt,
        rubric: dto.rubric,
        maxPoints: dto.maxPoints ?? 10,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });

    this.logger.log(`Created discussion topic ${topic.id} in module ${dto.moduleId}`);
    return topic;
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
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTopicWithPosts(topicId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      include: {
        module: {
          select: { id: true, title: true, courseId: true },
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
    return topic;
  }

  async createPost(dto: CreateDiscussionPostDto, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);
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

    const grade = await this.prisma.discussionGrade.upsert({
      where: { postId },
      update: {
        score: dto.score,
        rubricScores: dto.rubricScores,
        feedback: dto.feedback,
        graderId: user.firebaseId,
      },
      create: {
        postId,
        score: dto.score,
        rubricScores: dto.rubricScores,
        feedback: dto.feedback,
        graderId: user.firebaseId,
      },
    });

    this.logger.log(
      `Graded discussion post ${postId} with score ${dto.score} by grader ${user.firebaseId}`,
    );
    return grade;
  }
}
