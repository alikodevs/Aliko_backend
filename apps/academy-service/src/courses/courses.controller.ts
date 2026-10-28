import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseStatus } from '@prisma/client/academy';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import * as jwt from 'jsonwebtoken';
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  FindAllCoursesSchema,
  CourseIdSchema,
  UpdateCourseStatusSchema,
  AssignInstructorSchema,
  RejectCourseSchema,
  InstructorOnlySchema,
} from './courses.validation';

@Controller()
export class CoursesController {
  private readonly logger = new Logger(CoursesController.name);
  constructor(private readonly coursesService: CoursesService) {}

  @Post(['courses', 'academy/courses'])
  @MessagePattern({ cmd: 'create_course' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateCourseSchema))
  async create(
    @Body() body?: CreateCourseDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CreateCourseDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Course data is required');
    }

    this.logger.log(
      `Creating new course: "${dto.title}" by user: ${user.firebaseId}`,
    );
    try {
      return await this.coursesService.create(dto, user);
    } catch (error) {
      this.logger.error(
        `Failed to create course "${dto.title}" for user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['courses', 'academy/courses', 'courses/all', 'academy/courses/all'])
  @MessagePattern({ cmd: 'find_all_courses' })
  @UsePipes(new JoiValidationPipe(FindAllCoursesSchema))
  async findAll(
    @Payload() payload?: { query: any; user: AuthenticatedUser; clientIp?: string; clientCountry?: string },
    @Query() query?: any,
    @Req() req?: any,
  ) {
    const q = payload?.query || query || {};
    let user = payload?.user || req?.user;

    // Optional auth token resolution for admin / instructor views on public courses route
    if (!user && req?.headers?.authorization?.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.substring(7);
        const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';
        let decoded: any;
        try {
          decoded = jwt.verify(token, secret);
        } catch {
          decoded = jwt.decode(token);
        }
        if (decoded) {
          const firebaseId = decoded.uid || decoded.firebaseId || decoded.sub || decoded.id;
          user = {
            firebaseId,
            email: decoded.email,
            firstname: decoded.firstname || '',
            lastname: decoded.lastname || '',
            globalRole: decoded.globalRole || 'USER',
            role: decoded.academyActiveRole || decoded.academyRole || decoded.role || 'STUDENT',
            activeRole: decoded.academyActiveRole || decoded.academyRole,
            status: decoded.status || 'ACTIVE',
          };
          req.user = user;
        }
      } catch (_e) {}
    }

    const clientIp = payload?.clientIp || req?.ip;
    const clientCountry = payload?.clientCountry || req?.headers?.['cf-ipcountry'] || req?.headers?.['x-country-code'];
    this.logger.log(
      `Fetching courses with query: ${JSON.stringify(q)} for user: ${user?.firebaseId || 'guest'}`,
    );
    try {
      return await this.coursesService.findAll(
        q,
        user,
        clientIp,
        clientCountry,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch courses with query ${JSON.stringify(q)}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['courses/instructor/stats', 'academy/courses/instructor/stats', 'courses/instructor/my-courses', 'academy/courses/instructor/my-courses'])
  @MessagePattern({ cmd: 'get_instructor_courses_with_stats' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(InstructorOnlySchema))
  async getInstructorCoursesWithStats(
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching instructor courses with stats for user: ${user.firebaseId}`,
    );
    try {
      return await this.coursesService.getInstructorCoursesWithStats(user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch instructor courses with stats for user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['courses/instructor/drafts', 'academy/courses/instructor/drafts'])
  @MessagePattern({ cmd: 'get_my_draft_courses' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(InstructorOnlySchema))
  async getMyDraftCourses(
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching my draft courses for instructor: ${user.firebaseId}`,
    );
    try {
      return await this.coursesService.getInstructorDraftCourses(user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch my draft courses for instructor ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['courses/category/:category', 'academy/courses/category/:category'])
  async findByCategory(
    @Param('category') category: string,
    @Query() query?: any,
    @Req() req?: any,
    @Payload() payload?: any,
  ) {
    const q = { ...(payload?.query || query || {}), category };
    const user = payload?.user || req?.user;
    const clientIp = payload?.clientIp || req?.ip;
    const clientCountry = payload?.clientCountry || req?.headers?.['cf-ipcountry'] || req?.headers?.['x-country-code'];
    this.logger.log(`Fetching courses for category: ${category}`);
    return await this.coursesService.findAll(q, user, clientIp, clientCountry);
  }

  @Get(['courses/difficulty/:difficulty', 'academy/courses/difficulty/:difficulty'])
  async findByDifficulty(
    @Param('difficulty') difficulty: string,
    @Query() query?: any,
    @Req() req?: any,
    @Payload() payload?: any,
  ) {
    const q = { ...(payload?.query || query || {}), difficulty };
    const user = payload?.user || req?.user;
    const clientIp = payload?.clientIp || req?.ip;
    const clientCountry = payload?.clientCountry || req?.headers?.['cf-ipcountry'] || req?.headers?.['x-country-code'];
    this.logger.log(`Fetching courses for difficulty: ${difficulty}`);
    return await this.coursesService.findAll(q, user, clientIp, clientCountry);
  }

  @Get(['courses/slug/:slug', 'academy/courses/slug/:slug'])
  async findBySlug(
    @Param('slug') slug: string,
    @Req() req?: any,
    @Payload() payload?: any,
  ) {
    const user = payload?.user || req?.user;
    const clientIp = payload?.clientIp || req?.ip;
    const clientCountry = payload?.clientCountry || req?.headers?.['cf-ipcountry'] || req?.headers?.['x-country-code'];
    this.logger.log(`Fetching course for slug: ${slug}`);
    return await this.coursesService.findBySlug(slug, user, clientIp, clientCountry);
  }

  @Get(['courses/:id/structure', 'academy/courses/:id/structure'])
  @MessagePattern({ cmd: 'get_course_with_structure' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'STUDENT')
  @UsePipes(new JoiValidationPipe(CourseIdSchema))
  async getCourseWithStructure(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid course ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching course with full structure for ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.coursesService.getCourseWithStructure(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch course structure for ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['courses/:id', 'academy/courses/:id'])
  @MessagePattern({ cmd: 'find_course_by_id' })
  async findOne(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: any,
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid course ID');
    }
    const user = payload?.user || req?.user;
    const clientIp = payload?.clientIp || req?.ip;
    const clientCountry = payload?.clientCountry || req?.headers?.['cf-ipcountry'] || req?.headers?.['x-country-code'];
    this.logger.log(
      `Fetching details for course ID: ${id} by user: ${user?.firebaseId || 'guest'}`,
    );
    try {
      return await this.coursesService.findOne(
        id,
        user,
        clientIp,
        clientCountry,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch details for course ID ${id} by user ${user?.firebaseId || 'guest'}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Patch(['courses/:id', 'academy/courses/:id'])
  @Put(['courses/:id', 'academy/courses/:id'])
  @MessagePattern({ cmd: 'update_course' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateCourseSchema))
  async update(
    @Param('id') paramId?: string,
    @Body() body?: UpdateCourseDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      dto: UpdateCourseDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid course ID');
    }
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Course update data required');
    }

    this.logger.log(
      `Updating course ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.coursesService.update(id, dto, user);
    } catch (error) {
      this.logger.error(
        `Failed to update course ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(['courses/:id', 'academy/courses/:id'])
  @MessagePattern({ cmd: 'remove_course' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CourseIdSchema))
  async remove(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid course ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    this.logger.log(
      `Removing course ID: ${id} by user: ${user.firebaseId}`,
    );
    try {
      return await this.coursesService.remove(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to remove course ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Patch(['courses/:id/status', 'academy/courses/:id/status'])
  @Put(['courses/:id/status', 'academy/courses/:id/status'])
  @MessagePattern({ cmd: 'update_course_status' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateCourseStatusSchema))
  async updateStatus(
    @Param('id') paramId?: string,
    @Body() body?: { status: CourseStatus },
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      status: CourseStatus;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid course ID');
    }
    const status = payload?.status || body?.status;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!status) {
      throw new BadRequestException('Status is required');
    }

    this.logger.log(
      `Updating status for course ID: ${id} to ${status} by user: ${user.firebaseId}`,
    );
    try {
      return await this.coursesService.updateStatus(id, status, user);
    } catch (error) {
      this.logger.error(
        `Failed to update status for course ID ${id} to ${status} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post([
    'courses/:id/assign-instructor',
    'academy/courses/:id/assign-instructor',
    'courses/assign-instructor',
    'academy/courses/assign-instructor',
  ])
  @MessagePattern({ cmd: 'assign_course_instructor' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(AssignInstructorSchema))
  async assignInstructor(
    @Param('id') paramId?: string,
    @Body() body?: { id?: number; instructorId: string },
    @Req() req?: any,
    @Payload()
    payload?: {
      id: number;
      instructorId: string;
      user: AuthenticatedUser;
    },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : (paramId || body?.id);
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid course ID');
    }
    const instructorId = payload?.instructorId || body?.instructorId;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!instructorId) {
      throw new BadRequestException('Instructor ID required');
    }

    this.logger.log(
      `Assigning instructor ${instructorId} to course ID: ${id} by admin: ${user.firebaseId}`,
    );
    try {
      return await this.coursesService.assignInstructor(id, instructorId, user);
    } catch (error) {
      this.logger.error(
        `Failed to assign instructor ${instructorId} to course ID ${id} by admin ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post([
    'courses/:id/submit',
    'academy/courses/:id/submit',
    'courses/:id/submit-for-approval',
    'academy/courses/:id/submit-for-approval',
  ])
  @MessagePattern({ cmd: 'submit_course_for_approval' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CourseIdSchema))
  async submitForApproval(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid course ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    this.logger.log(
      `Submitting course ID: ${id} for approval by user: ${user.firebaseId}`,
    );
    try {
      return await this.coursesService.submitForApproval(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to submit course ID ${id} for approval by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(['courses/:id/approve', 'academy/courses/:id/approve'])
  @MessagePattern({ cmd: 'approve_course' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(CourseIdSchema))
  async approve(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid course ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    this.logger.log(
      `Approving course ID: ${id} by admin: ${user.firebaseId}`,
    );
    try {
      return await this.coursesService.approve(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to approve course ID ${id} by admin ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(['courses/:id/reject', 'academy/courses/:id/reject'])
  @MessagePattern({ cmd: 'reject_course' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(RejectCourseSchema))
  async reject(
    @Param('id') paramId?: string,
    @Body() body?: { reason: string },
    @Req() req?: any,
    @Payload() payload?: { id: number; reason: string; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid course ID');
    }
    const reason = payload?.reason || body?.reason || 'Course rejected';
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    this.logger.log(
      `Rejecting course ID: ${id} by admin: ${user.firebaseId}. Reason: ${reason}`,
    );
    try {
      return await this.coursesService.reject(id, reason, user);
    } catch (error) {
      this.logger.error(
        `Failed to reject course ID ${id} by admin ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

