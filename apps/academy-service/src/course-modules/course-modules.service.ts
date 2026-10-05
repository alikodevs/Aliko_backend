import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { AuthenticatedUser, UserService } from '../user/user.service';

// The verified user object passed from the API Gateway

@Injectable()
export class CourseModulesService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(dto: CreateCourseModuleDto, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    // Find the course to check for ownership
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    const isInstructor = course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to add a module to this course.',
      );
    }

    return await this.prisma.module.create({ data: dto });
  }

  async findAll(user: AuthenticatedUser, query: any = {}) {
    const academyProfile = await this.userService.getOrCreateProfile(user);

    // VISIBILITY: Non-admins only see modules of published courses or courses they instruct
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (academyProfile.role !== 'ADMIN') {
      where.OR = [
        { course: { status: 'PUBLISHED' } },
        { course: { instructorId: user.firebaseId } },
      ];
    }

    const [modules, total] = await Promise.all([
      this.prisma.module.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              status: true,
              instructorId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.module.count({ where }),
    ]);

    return {
      items: modules,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findAllByCourse(
    courseId: number,
    user: AuthenticatedUser,
    query: any = {},
  ) {
    console.log(`=== Accessing Course Modules ===`);
    console.log(`User ID: ${user.firebaseId}`);
    console.log(`Course ID: ${courseId}`);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    // VISIBILITY CHECK
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const isInstructor = course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (course.status !== 'PUBLISHED' && !isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You generally do not have permission to view content of this course.',
      );
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [modules, total] = await Promise.all([
      this.prisma.module.findMany({
        where: { courseId },
        skip,
        take: pageSize,
        include: {
          lessons: {
            select: {
              id: true,
              title: true,
              type: true,
              maxScore: true,
              dueDate: true,
              order: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { order: 'asc' },
          },
          exercises: {
            select: {
              id: true,
              title: true,
              type: true,
              points: true,
              order: true,
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.module.count({ where: { courseId } }),
    ]);

    return {
      items: modules,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        lessons: { orderBy: { order: 'asc' } },
        exercises: { orderBy: { order: 'asc' } },
        course: true,
      },
    });
    if (!module) throw new NotFoundException('Module not found');

    // AUTHORIZATION: Reuse the course-level check
    // This ensures that if the course is not accessible, the module is not accessible
    await this.findAllByCourse(module.course.id, user);

    const { course: _course, ...moduleData } = module;
    return moduleData;
  }

  async update(
    id: number,
    dto: UpdateCourseModuleDto,
    user: AuthenticatedUser,
  ) {
    // Find the module and its parent course for ownership check
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    const isInstructor = module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to update this module.',
      );
    }

    return await this.prisma.module.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');

    // AUTHORIZATION: User must be the course instructor or an admin.
    const isInstructor = module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this module.',
      );
    }

    return await this.prisma.module.delete({ where: { id } });
  }

  async findOneForInstructor(id: number, user: AuthenticatedUser) {
    const academyProfile = await this.userService.getOrCreateProfile(user);
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        course: {
          select: { instructorId: true, title: true },
        },
        lessons: {
          include: {
            contents: true,
            exercises: true,
          },
          orderBy: { order: 'asc' },
        },
        exercises: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!module) throw new NotFoundException('Module not found');

    const isInstructor = module.course.instructorId === user.firebaseId;
    const isAdmin = academyProfile.role === 'ADMIN';

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to view this module in instructor mode.',
      );
    }

    return module;
  }
}
