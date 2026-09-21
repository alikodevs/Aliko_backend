import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseStatus } from '../generated/client';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  FindAllCoursesSchema,
  CourseIdSchema,
  FindOneCourseSchema,
  UpdateCourseStatusSchema,
  AssignInstructorSchema,
  RejectCourseSchema,
  InstructorOnlySchema,
} from './courses.validation';

@Controller()
export class CoursesController {
  private readonly logger = new Logger(CoursesController.name);
  constructor(private readonly coursesService: CoursesService) {}

  @MessagePattern({ cmd: 'create_course' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CreateCourseSchema))
  async create(
    @Payload() payload: { dto: CreateCourseDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Creating new course: "${payload.dto.title}" by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.coursesService.create(payload.dto, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to create course "${payload.dto.title}" for user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_all_courses' })
  @UsePipes(new JoiValidationPipe(FindAllCoursesSchema))
  async findAll(
    @Payload() payload: { query: any; user: AuthenticatedUser; clientIp?: string; clientCountry?: string },
  ) {
    this.logger.log(
      `Fetching courses with query: ${JSON.stringify(payload.query)} for user: ${payload.user?.firebaseId || 'guest'}`,
    );
    try {
      return await this.coursesService.findAll(
        payload.query,
        payload.user,
        payload.clientIp,
        payload.clientCountry,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch courses with query ${JSON.stringify(payload.query)}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_course_by_id' })
  @UsePipes(new JoiValidationPipe(FindOneCourseSchema))
  async findOne(
    @Payload() payload: { id: number; user?: AuthenticatedUser; clientIp?: string; clientCountry?: string },
  ) {
    this.logger.log(
      `Fetching details for course ID: ${payload.id} by user: ${payload.user?.firebaseId || 'guest'}`,
    );
    try {
      return await this.coursesService.findOne(
        payload.id,
        payload.user,
        payload.clientIp,
        payload.clientCountry,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch details for course ID ${payload.id} by user ${payload.user?.firebaseId || 'guest'}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_course' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateCourseSchema))
  async update(
    @Payload()
    payload: {
      id: number;
      dto: UpdateCourseDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating course ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.coursesService.update(
        payload.id,
        payload.dto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update course ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'remove_course' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CourseIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing course ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.coursesService.remove(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to remove course ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_course_status' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UpdateCourseStatusSchema))
  async updateStatus(
    @Payload()
    payload: {
      id: number;
      status: CourseStatus;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Updating status for course ID: ${payload.id} to ${payload.status} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.coursesService.updateStatus(
        payload.id,
        payload.status,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update status for course ID ${payload.id} to ${payload.status} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'assign_course_instructor' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(AssignInstructorSchema))
  async assignInstructor(
    @Payload()
    payload: {
      id: number;
      instructorId: string;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Assigning instructor ${payload.instructorId} to course ID: ${payload.id} by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.coursesService.assignInstructor(
        payload.id,
        payload.instructorId,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to assign instructor ${payload.instructorId} to course ID ${payload.id} by admin ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'submit_course_for_approval' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CourseIdSchema))
  async submitForApproval(
    @Payload() payload: { id: number; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Submitting course ID: ${payload.id} for approval by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.coursesService.submitForApproval(
        payload.id,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to submit course ID ${payload.id} for approval by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'approve_course' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(CourseIdSchema))
  async approve(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Approving course ID: ${payload.id} by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.coursesService.approve(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to approve course ID ${payload.id} by admin ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'reject_course' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(RejectCourseSchema))
  async reject(
    @Payload() payload: { id: number; reason: string; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Rejecting course ID: ${payload.id} by admin: ${payload.user.firebaseId}. Reason: ${payload.reason}`,
    );
    try {
      return await this.coursesService.reject(
        payload.id,
        payload.reason,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reject course ID ${payload.id} by admin ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_instructor_courses_with_stats' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(InstructorOnlySchema))
  async getInstructorCoursesWithStats(
    @Payload() payload: { user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Fetching instructor courses with stats for user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.coursesService.getInstructorCoursesWithStats(
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch instructor courses with stats for user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_course_with_structure' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'STUDENT')
  @UsePipes(new JoiValidationPipe(CourseIdSchema))
  async getCourseWithStructure(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching course with full structure for ID: ${payload.id} by user: ${payload.user.firebaseId}`,
    );
    try {
      return await this.coursesService.getCourseWithStructure(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch course structure for ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_my_draft_courses' })
  @UseGuards(AcademyProfileGuard, RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(InstructorOnlySchema))
  async getMyDraftCourses(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching my draft courses for instructor: ${payload.user.firebaseId}`,
    );
    try {
      return await this.coursesService.getInstructorDraftCourses(payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch my draft courses for instructor ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
