import { Controller, UseGuards, UsePipes, Logger, HttpException } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CreateEnrollmentSchema,
  EnrollmentIdSchema,
  FindAllEnrollmentsSchema,
  CohortIdEnrollmentSchema,
  UserIdEnrollmentSchema,
  CourseIdEnrollmentSchema,
  UserOnlySchema,
} from './enrollments.validation';

/**
 * Helper to convert any thrown exception into an RpcException
 * that preserves the original HTTP status code and message.
 * This is necessary because NestJS microservice transports
 * do NOT apply HTTP exception filters — they serialize
 * unrecognised errors as generic "Internal server error".
 */
function toRpcException(error: any): RpcException {
  if (error instanceof RpcException) return error;

  const statusCode =
    error instanceof HttpException ? error.getStatus() : 500;

  let message = error?.message || 'Internal server error';
  let errorName = 'Internal Server Error';

  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'object') {
      const res = response as any;
      message = Array.isArray(res.message)
        ? res.message[0]
        : res.message || message;
      errorName = res.error || error.name || errorName;
    } else {
      message = response as string;
    }
  }

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

  @MessagePattern({ cmd: 'create_enrollment' })
  @UsePipes(new JoiValidationPipe(CreateEnrollmentSchema))
  async create(
    @Payload() payload: { dto: CreateEnrollmentDto; user: AuthenticatedUser; clientIp?: string; clientCountry?: string },
  ) {
    this.logger.log(
      `Enrolling user in course ID: ${payload.dto.courseId} (requested by: ${payload.user.firebaseId}) [IP: ${payload.clientIp || 'N/A'}, Country: ${payload.clientCountry || 'N/A'}]`,
    );
    try {
      return await this.enrollmentsService.create(payload.dto, payload.user, payload.clientIp, payload.clientCountry);
    } catch (error) {
      this.logger.error(
        `Failed to create enrollment for course ID ${payload.dto.courseId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'find_all_enrollments' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(FindAllEnrollmentsSchema))
  async findAll(@Payload() payload: { user: AuthenticatedUser; query?: any }) {
    this.logger.log(
      `Admin ${payload.user.firebaseId} is fetching all enrollments with query: ${JSON.stringify(payload.query)}`,
    );
    try {
      return await this.enrollmentsService.findAll(payload.user, payload.query);
    } catch (error) {
      this.logger.error(
        `Admin ${payload.user.firebaseId} failed to fetch all enrollments: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'find_instructor_enrollments' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(FindAllEnrollmentsSchema))
  async findInstructorEnrollments(
    @Payload() payload: { user: AuthenticatedUser; query?: any },
  ) {
    this.logger.log(
      `Instructor ${payload.user.firebaseId} is fetching their student enrollments`,
    );
    try {
      return await this.enrollmentsService.findByInstructor(
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${payload.user.firebaseId} failed to fetch their enrollments: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'find_enrollments_by_cohort' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CohortIdEnrollmentSchema))
  async findByCohort(
    @Payload()
    payload: {
      cohortId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    this.logger.log(
      `Fetching enrollments for cohort ID: ${payload.cohortId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.enrollmentsService.findByCohort(
        payload.cohortId,
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch enrollments for cohort ID ${payload.cohortId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'remove_enrollment' })
  @UsePipes(new JoiValidationPipe(EnrollmentIdSchema))
  async remove(@Payload() payload: { id: number; user: AuthenticatedUser }) {
    this.logger.log(
      `Removing enrollment ID: ${payload.id} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.enrollmentsService.remove(payload.id, payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to remove enrollment ID ${payload.id} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'find_enrollments_by_user' })
  @UsePipes(new JoiValidationPipe(UserIdEnrollmentSchema))
  async findEnrollmentsByUser(
    @Payload() payload: { userId: string; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Fetching enrollments for user ID: ${payload.userId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.enrollmentsService.findByUserId(
        payload.userId,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch enrollments for user ID ${payload.userId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'find_my_enrollments' })
  @UsePipes(new JoiValidationPipe(UserOnlySchema))
  async findMyEnrollments(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(
      `User ${payload.user.firebaseId} is fetching their own enrollments`,
    );
    try {
      return await this.enrollmentsService.findMyEnrollments(payload.user);
    } catch (error) {
      this.logger.error(
        `User ${payload.user.firebaseId} failed to fetch their own enrollments: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'find_enrollments_by_course' })
  @UsePipes(new JoiValidationPipe(CourseIdEnrollmentSchema))
  async findEnrollmentsByCourse(
    @Payload()
    payload: {
      courseId: number;
      user: AuthenticatedUser;
      query?: any;
    },
  ) {
    this.logger.log(
      `Fetching enrollments for course ID: ${payload.courseId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.enrollmentsService.findByCourse(
        payload.courseId,
        payload.user,
        payload.query,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch enrollments for course ID ${payload.courseId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw toRpcException(error);
    }
  }
}
