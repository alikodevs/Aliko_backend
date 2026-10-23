import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { AddTextbookDto, AssignReadingDto } from './dto';

@Injectable()
export class CurriculumCrosswalkService {
  private readonly logger = new Logger(CurriculumCrosswalkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async addTextbook(dto: AddTextbookDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const isInstructor = course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'Only instructors or admins can add course textbooks.',
      );
    }

    const textbook = await this.prisma.courseTextbook.create({
      data: {
        courseId: dto.courseId,
        title: dto.title,
        author: dto.author,
        edition: dto.edition || null,
        isbn: dto.isbn || null,
        publisher: dto.publisher || null,
      },
    });

    this.logger.log(`Added textbook "${textbook.title}" to course ${dto.courseId}`);
    return textbook;
  }

  async getTextbooksByCourse(courseId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.courseTextbook.findMany({
      where: { courseId },
      include: {
        _count: {
          select: { readings: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignReading(dto: AssignReadingDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      include: {
        module: {
          include: { course: true },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const isInstructor =
      lesson.module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'Only instructors or admins can assign lesson readings.',
      );
    }

    const textbook = await this.prisma.courseTextbook.findUnique({
      where: { id: dto.textbookId },
    });
    if (!textbook) throw new NotFoundException('Textbook not found');

    const reading = await this.prisma.lessonReading.create({
      data: {
        lessonId: dto.lessonId,
        textbookId: dto.textbookId,
        chapters: dto.chapters,
        pageRange: dto.pageRange,
      },
      include: {
        textbook: true,
      },
    });

    this.logger.log(
      `Assigned reading (${dto.chapters}, ${dto.pageRange}) to lesson ${dto.lessonId}`,
    );
    return reading;
  }

  async getReadingsByLesson(lessonId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);
    return this.prisma.lessonReading.findMany({
      where: { lessonId },
      include: { textbook: true },
    });
  }

  async generateCourseCrosswalk(courseId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        textbooks: true,
        modules: {
          include: {
            discussionTopics: {
              select: { id: true, title: true, maxPoints: true },
            },
            lessons: {
              include: {
                readings: {
                  include: { textbook: true },
                },
                exercises: {
                  select: { id: true, title: true, points: true, type: true },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    // Build the visual syllabus correlation table
    const crosswalkMatrix = course.modules.map((mod) => ({
      moduleId: mod.id,
      moduleTitle: mod.title,
      track: mod.track,
      isOrientationModule: mod.isOrientationModule,
      discussionTopics: mod.discussionTopics,
      units: mod.lessons.map((lesson) => ({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonType: lesson.type,
        isCreditHour: lesson.isCreditHour,
        isWeekOneAttendanceGate: lesson.isWeekOneAttendanceGate,
        assignedTextbookReadings: lesson.readings.map((r) => ({
          textbookTitle: r.textbook.title,
          edition: r.textbook.edition,
          isbn: r.textbook.isbn,
          assignedChapters: r.chapters,
          pageRange: r.pageRange,
        })),
        assessments: lesson.exercises,
      })),
    }));

    return {
      courseId: course.id,
      courseTitle: course.title,
      accreditationStandard: 'WAC 246-841A-440 Curriculum Crosswalk',
      textbooks: course.textbooks,
      curriculumMatrix: crosswalkMatrix,
    };
  }
}
