import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateEnrollmentSchema,
  FindAllEnrollmentsSchema,
  CohortIdEnrollmentSchema,
  EnrollmentIdSchema,
  UserIdEnrollmentSchema,
  CourseIdEnrollmentSchema,
} from './enrollments.validation';

function toRpcException(error: any): RpcException {
  if (error instanceof RpcException) {
    return error;
  }
  const statusCode = error?.status || error?.statusCode || 500;
  const message = error?.message || 'Internal server error';
  const errorName = error?.name || 'Error';
  return new RpcException({
    statusCode,
    message,
    error: errorName,
    timestamp: new Date().toISOString(),
  });
}

@Controller()
@UseGuards(AcademyProfileGuard)
export class EnrollmentsController {
  private readonly logger = new Logger(EnrollmentsController.name);
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post(['enrollment', 'enrollments', 'academy/enrollment', 'academy/enrollments'])
  @MessagePattern({ cmd: 'create_enrollment' })
  @UsePipes(new JoiValidationPipe(CreateEnrollmentSchema))
  async create(
    @Body() body?: CreateEnrollmentDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: CreateEnrollmentDto;
      user: AuthenticatedUser;
      clientIp?: string;
      clientCountry?: string;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required to enroll in a course');
    }
    if (!dto || !dto.courseId) {
      throw new BadRequestException('courseId is required');
    }
    const clientIp = payload?.clientIp || req?.ip;
    const clientCountry = payload?.clientCountry || req?.headers?.['cf-ipcountry'] || req?.headers?.['x-country-code'];
    this.logger.log(
      `Enrolling user in course ID: ${dto.courseId} (requested by: ${user.firebaseId}) [IP: ${clientIp || 'N/A'}, Country: ${clientCountry || 'N/A'}]`,
    );
    try {
      return await this.enrollmentsService.create(dto, user, clientIp, clientCountry);
    } catch (error) {
      this.logger.error(
        `Failed to create enrollment for course ID ${dto.courseId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Get(['enrollments', 'academy/enrollments'])
  @MessagePattern({ cmd: 'find_all_enrollments' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(FindAllEnrollmentsSchema))
  async findAll(
    @Query() query?: any,
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser; query?: any },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query || {};
    this.logger.log(
      `Admin ${user.firebaseId} is fetching all enrollments with query: ${JSON.stringify(q)}`,
    );
    try {
      return await this.enrollmentsService.findAll(user, q);
    } catch (error) {
      this.logger.error(
        `Admin ${user.firebaseId} failed to fetch all enrollments: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Get(['enrollments/instructor', 'academy/enrollments/instructor'])
  @MessagePattern({ cmd: 'find_instructor_enrollments' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(FindAllEnrollmentsSchema))
  async findInstructorEnrollments(
    @Query() query?: any,
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser; query?: any },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query || {};
    this.logger.log(
      `Instructor ${user.firebaseId} is fetching their student enrollments`,
    );
    try {
      return await this.enrollmentsService.findByInstructor(
        user,
        q,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${user.firebaseId} failed to fetch their enrollments: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Get(['enrollments/cohort/:cohortId', 'academy/enrollments/cohort/:cohortId'])
  @MessagePattern({ cmd: 'find_enrollments_by_cohort' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CohortIdEnrollmentSchema))
  async findByCohort(
    @Param('cohortId') paramCohortId?: string,
    @Query() query?: any,
    @Req() req?: any,
    @Payload()
    payload?: {
      cohortId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    const rawCohortId = payload?.cohortId !== undefined ? payload.cohortId : paramCohortId;
    const cohortId = Number(rawCohortId);
    if (!cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Invalid cohort ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query || {};
    this.logger.log(
      `Fetching enrollments for cohort ID: ${cohortId} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.enrollmentsService.findByCohort(
        cohortId,
        user,
        q,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch enrollments for cohort ID ${cohortId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Delete(['enrollments/:id', 'academy/enrollments/:id'])
  @MessagePattern({ cmd: 'remove_enrollment' })
  @UsePipes(new JoiValidationPipe(EnrollmentIdSchema))
  async remove(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: number; user: AuthenticatedUser },
  ) {
    const rawId = payload?.id !== undefined ? payload.id : paramId;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid enrollment ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Removing enrollment ID: ${id} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.enrollmentsService.remove(id, user);
    } catch (error) {
      this.logger.error(
        `Failed to remove enrollment ID ${id} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Get(['enrollments/user/:userId', 'academy/enrollments/user/:userId'])
  @MessagePattern({ cmd: 'find_enrollments_by_user' })
  @UsePipes(new JoiValidationPipe(UserIdEnrollmentSchema))
  async findEnrollmentsByUser(
    @Param('userId') paramUserId?: string,
    @Req() req?: any,
    @Payload() payload?: { userId: string; user: AuthenticatedUser },
  ) {
    const userId = payload?.userId || paramUserId;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching enrollments for user ID: ${userId} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.enrollmentsService.findByUserId(
        userId,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch enrollments for user ID ${userId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Get(['enrollment/me', 'enrollments/me', 'academy/enrollment/me', 'academy/enrollments/me'])
  @MessagePattern({ cmd: 'find_my_enrollments' })
  async findMyEnrollments(
    @Payload() payload?: { user: AuthenticatedUser },
    @Req() req?: any,
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `User ${user.firebaseId} is fetching their own enrollments`,
    );
    try {
      return await this.enrollmentsService.findMyEnrollments(user);
    } catch (error) {
      this.logger.error(
        `User ${user.firebaseId} failed to fetch their own enrollments: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @Get(['enrollments/course/:courseId', 'academy/enrollments/course/:courseId'])
  @MessagePattern({ cmd: 'find_enrollments_by_course' })
  @UsePipes(new JoiValidationPipe(CourseIdEnrollmentSchema))
  async findEnrollmentsByCourse(
    @Param('courseId') paramCourseId?: string,
    @Query() query?: any,
    @Req() req?: any,
    @Payload()
    payload?: {
      courseId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const courseId = Number(rawCourseId);
    if (!courseId || isNaN(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const q = payload?.query || query || {};
    this.logger.log(
      `Fetching enrollments for course ID: ${courseId} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.enrollmentsService.findByCourse(
        courseId,
        user,
        q,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch enrollments for course ID ${courseId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }
}
