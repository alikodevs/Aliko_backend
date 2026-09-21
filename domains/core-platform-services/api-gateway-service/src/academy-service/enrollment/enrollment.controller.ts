import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
  Request,
  ParseIntPipe,
  Logger,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { StudentAccessGuard, AdminAccessGuard } from '../../common/guards/academy-status.guard';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Enrollments')
@Controller('academy/enrollment')
@UseGuards(AuthGuard)
export class EnrollmentController {
  private readonly logger = new Logger(EnrollmentController.name);

  constructor(@Inject('ACADEMY_SERVICE') private academyClient: ClientProxy) {}

  // Create enrollment (Student)
  @Post()
  @ApiOperation({
    summary: 'Enroll in a course',
    description: '👤 Student enrollment into a course or cohort',
  })
  @ApiResponse({ status: 201, description: 'Enrollment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid enrollment data' })
  @ApiBody({ type: CreateEnrollmentDto })
  async createEnrollment(
    @Request() req: RequestWithUser,
    @Body() createEnrollmentDto: CreateEnrollmentDto,
  ) {
    this.logger.log(
      `Creating enrollment. DTO: ${JSON.stringify(createEnrollmentDto)}, User: ${JSON.stringify(req.user)}`,
    );

    // ---- existing logic untouched ----
    console.log('Enrollment Controller - Raw request body:', req.body);

    if (
      createEnrollmentDto.courseId === undefined ||
      createEnrollmentDto.courseId === null
    ) {
      throw new BadRequestException('Course ID is required');
    }

    if (!Number.isInteger(createEnrollmentDto.courseId)) {
      throw new BadRequestException('Course ID must be an integer');
    }

    if (
      createEnrollmentDto.cohortId !== undefined &&
      createEnrollmentDto.cohortId !== null
    ) {
      if (!Number.isInteger(createEnrollmentDto.cohortId)) {
        throw new BadRequestException('Cohort ID must be an integer');
      }
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['cf-connecting-ip'] as string) ||
      req.ip;
    const clientCountry = (req.headers['cf-ipcountry'] as string) || undefined;

    const payload = {
      dto: createEnrollmentDto,
      user: req.user,
      clientIp,
      clientCountry,
    };

    return this.academyClient
      .send({ cmd: 'create_enrollment' }, payload)
      .toPromise();
  }

  // Create Self-Paced Course Enrollment
  @Post('course/:courseId')
  @ApiOperation({
    summary: 'Enroll in a self-paced course',
    description: '👤 Enroll directly into a course without a cohort',
  })
  @ApiResponse({ status: 201, description: 'Enrollment created successfully' })
  @ApiParam({ name: 'courseId', type: Number })
  async enrollInCourse(
    @Request() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    const payload = {
      dto: { courseId },
      user: req.user,
    };
    return this.academyClient.send({ cmd: 'create_enrollment' }, payload).toPromise();
  }

  // Create Cohort Enrollment
  @Post('cohort/:cohortId')
  @ApiOperation({
    summary: 'Enroll in a cohort',
    description: '👤 Enroll into a specific instructor-led cohort',
  })
  @ApiResponse({ status: 201, description: 'Enrollment created successfully' })
  @ApiParam({ name: 'cohortId', type: Number })
  // Note: Since a cohort belongs to a course, the frontend or microservice usually needs to resolve courseId
  // The backend already validates cohort's association. We should require `courseId` in the body if the backend doesn't resolve it automatically,
  // but let's assume `create_enrollment` in academy backend needs courseId passed. Actually, I need to provide `courseId` in the body here.
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        courseId: { type: 'number', description: 'ID of the course the cohort belongs to' }
      },
      required: ['courseId']
    }
  })
  async enrollInCohort(
    @Request() req: RequestWithUser,
    @Param('cohortId', ParseIntPipe) cohortId: number,
    @Body() body: { courseId: number },
  ) {
    if (!body?.courseId) {
      throw new BadRequestException('courseId is required in the request body');
    }
    const payload = {
      dto: { courseId: body.courseId, cohortId },
      user: req.user,
    };
    return this.academyClient.send({ cmd: 'create_enrollment' }, payload).toPromise();
  }

  // Admin / Instructor
  @Get()
  @ApiOperation({
    summary: 'Get all enrollments',
    description: '🔒 Admin / Instructor',
  })
  findAllEnrollments(@Request() req: RequestWithUser, @Query() query: any) {
    const payload = { user: req.user, query };
    return this.academyClient.send({ cmd: 'find_all_enrollments' }, payload);
  }

  @Get('instructor/my')
  @ApiOperation({
    summary: 'Get enrollments for current instructor courses',
    description: '🔒 Instructor only',
  })
  getMyInstructorEnrollments(@Request() req: RequestWithUser, @Query() query: any) {
    return this.academyClient.send({ cmd: 'find_instructor_enrollments' }, { user: req.user, query });
  }

  // Student
  @Get('me')
  @ApiOperation({ summary: 'Get my enrollments' })
  findMyEnrollments(@Request() req: RequestWithUser) {
    const payload = { user: req.user };
    return this.academyClient.send({ cmd: 'find_my_enrollments' }, payload);
  }

  // Student
  @Get('my-courses')
  @ApiOperation({ summary: 'Get my enrolled courses' })
  findMyCourses(@Request() req: RequestWithUser) {
    const payload = { user: req.user };
    return this.academyClient.send({ cmd: 'find_my_enrollments' }, payload);
  }

  // Instructor
  @Get('cohort/:cohortId')
  @ApiOperation({
    summary: 'Get enrollments by cohort',
    description: '🔒 Instructor only',
  })
  @ApiParam({ name: 'cohortId', type: Number })
  findEnrollmentsByCohort(
    @Request() req: RequestWithUser,
    @Param('cohortId', ParseIntPipe) cohortId: number,
    @Query() query: any,
  ) {
    const payload = { cohortId, user: req.user, query };
    return this.academyClient.send(
      { cmd: 'find_enrollments_by_cohort' },
      payload,
    );
  }

  // Admin
  @Delete(':id')
  @ApiOperation({
    summary: 'Remove enrollment',
    description: '🔒 Admin only',
  })
  @ApiParam({ name: 'id', type: Number })
  removeEnrollment(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    const payload = { id, user: req.user };
    return this.academyClient.send({ cmd: 'remove_enrollment' }, payload);
  }

  // Admin
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get enrollments by user ID',
    description: '🔒 Admin only',
  })
  @ApiParam({ name: 'userId', type: String })
  findEnrollmentsByUserId(@Request() req: RequestWithUser, @Param('userId') userId: string) {
    const payload = { userId, user: req.user };
    return this.academyClient.send(
      { cmd: 'find_enrollments_by_user' },
      payload,
    );
  }

  // Get enrollments by course
  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get enrollments by course' })
  @ApiResponse({ status: 200, description: 'List of enrollments for a course' })
  @ApiParam({ name: 'courseId', type: Number })
  getEnrollmentsByCourse(
    @Request() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() query: any,
  ) {
    const payload = { courseId, user: req.user, query };
    // Assuming backend will support this or redirecting to general find
    return this.academyClient.send({ cmd: 'find_enrollments_by_course' }, payload);
  }

  // Get my enrollments (alternative path)
  @Get('my')
  @ApiOperation({ summary: 'Get my enrollments' })
  @ApiResponse({ status: 200, description: 'List of user enrollments' })
  getMyEnrollments(@Request() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const payload = { user: req.user };
    return this.academyClient.send({ cmd: 'find_my_enrollments' }, payload);
  }
}
