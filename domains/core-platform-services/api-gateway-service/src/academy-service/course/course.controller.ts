import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../../file-upload-service/file-upload.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Headers,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { AcademyStatusGuard, TeacherAccessGuard, StudentAccessGuard, AdminAccessGuard } from '../../common/guards/academy-status.guard';
import { CourseAccessGuard, EnrollmentGuard } from '../../common/guards/enrollment.guard';
import { AcademyRolesGuard, Roles, AcademyRole } from '../../common/guards/academy-roles.guard';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateCourseStatusDto } from './dto/update-course-status.dto';
import { AssignInstructorDto } from './dto/assign-instructor.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('academy/courses')
@UseGuards(AuthGuard)
export class CourseController {
  constructor(
    @Inject('ACADEMY_SERVICE') private academyClient: ClientProxy,
    private readonly fileUploadService: FileUploadService
  ) {}

  // Create a new course
  @Post()
  @UseGuards(AuthGuard, TeacherAccessGuard)
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Teacher role required' })
  @ApiBody({ type: CreateCourseDto })
  async createCourse(
    @Request() req: RequestWithUser, 
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    if (thumbnail) {
      const uploadResult = await this.fileUploadService.uploadFile(thumbnail, 'image');
      createCourseDto.thumbnail = uploadResult.url;
    }

    const payload = {
      dto: createCourseDto,
      user: req.user,
    };
    return this.academyClient.send({ cmd: 'create_course' }, payload);
  }

  // Get all courses
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Query parameters (pagination, filters, etc.)',
  })
  findAllCourses(
    @Request() req: RequestWithUser,
    @Query() query: any,
    @Headers('cf-ipcountry') cfCountry?: string,
  ) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip;
    const payload = {
      query,
      user: req.user!,
      clientIp,
      clientCountry: cfCountry || undefined,
    };
    return this.academyClient.send({ cmd: 'find_all_courses' }, payload);
  }

  // Get instructor's own courses
  @Get('instructor/my')
  @UseGuards(AuthGuard, TeacherAccessGuard)
  @ApiOperation({ summary: "Get currently logged-in instructor's courses" })
  @ApiResponse({ status: 200, description: 'List of instructor courses' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'status', required: false })
  getMyCourses(@Request() req: RequestWithUser, @Query() query: any) {
    const payload = { 
      query: { ...query, instructorId: req.user!.firebaseId }, 
      user: req.user! 
    };
    return this.academyClient.send({ cmd: 'find_all_courses' }, payload);
  }

  // Get instructor's courses with full stats
  @Get('instructor/stats')
  @UseGuards(AuthGuard, TeacherAccessGuard)
  @ApiOperation({ summary: "Get instructor's courses with detailed stats" })
  @ApiResponse({ status: 200, description: 'List of courses with stats' })
  getInstructorCoursesWithStats(@Request() req: RequestWithUser) {
    return this.academyClient.send({ cmd: 'get_instructor_courses_with_stats' }, { user: req.user });
  }

  // Get all courses with all statuses (Admin only)
  @Get('all')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @ApiOperation({ summary: 'Get all courses regardless of status' })
  @ApiResponse({ status: 200, description: 'List of all courses' })
  getAllCourses(@Request() req: RequestWithUser, @Query() query: any) {
    const payload = { 
      query: { ...query }, 
      user: req.user!
    };
    return this.academyClient.send({ cmd: 'find_all_courses' }, payload);
  }

  // Get pending courses (Admin only)
  @Get('pending')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @ApiOperation({ summary: 'Get courses pending approval' })
  @ApiResponse({ status: 200, description: 'List of pending courses' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiQuery({ name: 'page', required: false })
  getPendingCourses(@Request() req: RequestWithUser, @Query() query: any) {
    const payload = { 
      query: { ...query, status: 'PENDING_APPROVAL' }, 
      user: req.user! 
    };
    return this.academyClient.send({ cmd: 'find_all_courses' }, payload);
  }

  // Get draft courses (Admin only)
  @Get('draft')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @ApiOperation({ summary: 'Get courses in draft status' })
  @ApiResponse({ status: 200, description: 'List of draft courses' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiQuery({ name: 'page', required: false })
  getDraftCourses(@Request() req: RequestWithUser, @Query() query: any) {
    const payload = { 
      query: { ...query, status: 'DRAFT' }, 
      user: req.user 
    };
    return this.academyClient.send({ cmd: 'find_all_courses' }, payload);
  }

  // Get courses by status (Admin only for non-published)
  @Get('status/:status')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @ApiOperation({ summary: 'Get courses by specific status' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  @ApiParam({ name: 'status', type: String })
  getCoursesByStatus(
    @Request() req: RequestWithUser,
    @Param('status') status: string,
    @Query() query: any,
  ) {
    const payload = { 
      query: { ...query, status }, 
      user: req.user 
    };
    return this.academyClient.send({ cmd: 'find_all_courses' }, payload);
  }

  // Get a course by ID
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiResponse({ status: 200, description: 'Course found' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', type: Number })
  findCourseById(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Headers('cf-ipcountry') cfCountry?: string,
  ) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip;
    const payload = {
      id,
      user: req.user!,
      clientIp,
      clientCountry: cfCountry || undefined,
    };
    return this.academyClient.send({ cmd: 'find_course_by_id' }, payload);
  }

  // Get full course structure for instructors/admins
  @Get(':id/structure')
  @UseGuards(AuthGuard, TeacherAccessGuard)
  @ApiOperation({ summary: 'Get full course structure (modules, lessons, content) for management' })
  @ApiResponse({ status: 200, description: 'Full course structure' })
  @ApiParam({ name: 'id', type: Number })
  getCourseStructure(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.academyClient.send({ cmd: 'get_course_with_structure' }, { id, user: req.user });
  }

  // Update a course
  @Patch(':id')
  @UseGuards(AuthGuard, EnrollmentGuard)
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a course' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCourseDto })
  async updateCourse(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDto,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    if (thumbnail) {
      const uploadResult = await this.fileUploadService.uploadFile(thumbnail, 'image');
      updateCourseDto.thumbnail = uploadResult.url;
    }

    const payload = {
      id,
      dto: updateCourseDto,
      user: req.user,
    };
    return this.academyClient.send({ cmd: 'update_course' }, payload);
  }

  // Remove a course
  @Delete(':id')
  @UseGuards(AuthGuard, EnrollmentGuard)
  @ApiOperation({ summary: 'Delete a course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', type: Number })
  removeCourse(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    const payload = {
      id,
      user: req.user,
    };
    return this.academyClient.send({ cmd: 'remove_course' }, payload);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @ApiOperation({ summary: 'Update course status' })
  @ApiResponse({ status: 200, description: 'Course status updated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCourseStatusDto })
  updateCourseStatus(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCourseStatusDto,
  ) {
    const payload = {
      id,
      status: body.status,
      user: req.user,
    };
    return this.academyClient.send({ cmd: 'update_course_status' }, payload);
  }

  // Submit for approval
  @Post(':id/submit')
  @UseGuards(AuthGuard, TeacherAccessGuard)
  @ApiOperation({ summary: 'Submit course for admin approval' })
  @ApiResponse({ status: 200, description: 'Course submitted for approval' })
  @ApiParam({ name: 'id', type: Number })
  submitForApproval(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.academyClient.send({ cmd: 'submit_course_for_approval' }, { id, user: req.user });
  }

  // Approve course
  @Post(':id/approve')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @ApiOperation({ summary: 'Approve a course (Admin)' })
  @ApiResponse({ status: 200, description: 'Course approved and published' })
  @ApiParam({ name: 'id', type: Number })
  approveCourse(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.academyClient.send({ cmd: 'approve_course' }, { id, user: req.user });
  }

  // Reject course
  @Post(':id/reject')
  @UseGuards(AuthGuard, AdminAccessGuard)
  @ApiOperation({ summary: 'Reject a course (Admin)' })
  @ApiResponse({ status: 200, description: 'Course rejected' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ schema: { properties: { reason: { type: 'string' } } } })
  rejectCourse(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.academyClient.send({ cmd: 'reject_course' }, { id, reason, user: req.user });
  }

  // Assign instructor
  @Patch(':id/instructor')
  @ApiOperation({ summary: 'Assign instructor to course' })
  @ApiResponse({
    status: 200,
    description: 'Instructor assigned successfully',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: AssignInstructorDto })
  assignCourseInstructor(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AssignInstructorDto,
  ) {
    const payload = {
      id,
      instructorId: body.instructorId,
      user: req.user,
    };
    return this.academyClient.send(
      { cmd: 'assign_course_instructor' },
      payload,
    );
  }

  // Get courses by category
  @Public()
  @Get('category/:category')
  @ApiOperation({ summary: 'Get courses by category' })
  @ApiResponse({ status: 200, description: 'List of courses by category' })
  @ApiParam({ name: 'category', type: String })
  getCoursesByCategory(
    @Request() req: RequestWithUser,
    @Param('category') category: string,
  ) {
    const payload = { category, user: req.user, query: { category } };
    return this.academyClient.send({ cmd: 'find_all_courses' }, payload);
  }

  // Get courses by difficulty
  @Public()
  @Get('difficulty/:difficulty')
  @ApiOperation({ summary: 'Get courses by difficulty' })
  @ApiResponse({ status: 200, description: 'List of courses by difficulty' })
  @ApiParam({ name: 'difficulty', type: String })
  getCoursesByDifficulty(
    @Request() req: RequestWithUser,
    @Param('difficulty') difficulty: string,
  ) {
    const payload = { difficulty, user: req.user, query: { difficulty } };
    return this.academyClient.send({ cmd: 'find_all_courses' }, payload);
  }
}
