import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

import { AuthenticatedUser, RequestWithUser } from '../../common/types/request-with-user.interface';

@ApiTags('Progress & Analytics')
@Controller('academy/progress')
@UseGuards(AuthGuard)
export class ProgressAndAnalyticsController {
  constructor(
    @Inject('ACADEMY_SERVICE') private readonly academyClient: ClientProxy,
  ) {}

  private ensureUser(req: RequestWithUser): AuthenticatedUser {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    return req.user;
  }

  @Get('instructor/stats')
  @ApiOperation({
    summary: 'Get instructor statistics',
    description: '🔒 Instructor / Admin only',
  })
  instructorStats(@Request() req: RequestWithUser) {
    const user = this.ensureUser(req);
    return this.academyClient.send({ cmd: 'get_instructor_stats' }, { user });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard progress for current user' })
  myCoursesProgress(@Request() req: RequestWithUser) {
    const user = this.ensureUser(req);
    return this.academyClient.send({ cmd: 'get_my_dashboard' }, { user });
  }

  @Post('course/:courseId/lesson/:lessonId/complete')
  @ApiOperation({ summary: 'Mark lesson as complete for the current user' })
  @ApiParam({ name: 'courseId', type: Number })
  @ApiParam({ name: 'lessonId', type: Number })
  completeLesson(
    @Request() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ) {
    const user = this.ensureUser(req);
    return this.academyClient.send(
      { cmd: 'complete_lesson' },
      { user, courseId, lessonId },
    );
  }

  @Get('course/:courseId/lesson/:lessonId/complete')
  @ApiOperation({ summary: 'Get lesson completion status for the current user' })
  @ApiParam({ name: 'courseId', type: Number })
  @ApiParam({ name: 'lessonId', type: Number })
  getLessonStatus(
    @Request() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ) {
    const user = this.ensureUser(req);
    return this.academyClient.send(
      { cmd: 'get_lesson_status' },
      { user, courseId, lessonId },
    );
  }

  @Get('course/:courseId/analytics')
  @ApiOperation({
    summary: 'Get course analytics',
    description: '🔒 Instructor / Admin only',
  })
  @ApiParam({ name: 'courseId', type: Number })
  courseAnalytics(
    @Request() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    const user = this.ensureUser(req);
    return this.academyClient.send(
      { cmd: 'get_course_analytics' },
      { user, courseId },
    );
  }

  @Get('course/:courseId/students')
  @ApiOperation({
    summary: 'Get all students progress for a course',
    description: '🔒 Instructor / Admin only',
  })
  @ApiParam({ name: 'courseId', type: Number })
  studentsProgress(
    @Request() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    const user = this.ensureUser(req);
    return this.academyClient.send(
      { cmd: 'get_students_progress_for_course' },
      { user, courseId },
    );
  }

  @Get('course/:courseId/user/:targetUserId')
  @ApiOperation({
    summary: 'Get a specific student progress in a course',
    description: '🔒 Instructor / Admin only',
  })
  @ApiParam({ name: 'courseId', type: Number })
  @ApiParam({ name: 'targetUserId', type: String })
  userProgressInCourse(
    @Request() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('targetUserId') targetUserId: string,
  ) {
    const user = this.ensureUser(req);
    return this.academyClient.send(
      { cmd: 'get_user_progress' },
      { user, courseId, targetUserId },
    );
  }

  @Get('analytics/overall')
  @ApiOperation({
    summary: 'Get overall platform analytics',
    description: '🔒 Admin only',
  })
  overallAnalytics(@Request() req: RequestWithUser) {
    const user = this.ensureUser(req);
    return this.academyClient.send({ cmd: 'get_overall_analytics' }, { user });
  }

  @Get('analytics/student')
  @ApiOperation({ summary: 'Get student stats for sidebar / dashboard' })
  studentStats(@Request() req: RequestWithUser) {
    const user = this.ensureUser(req);
    return this.academyClient.send({ cmd: 'get_student_stats' }, { user });
  }

  @Get('course/:courseId/next-recommended')
  @ApiOperation({ summary: 'Get the recommended next lesson to take in a course' })
  @ApiParam({ name: 'courseId', type: Number })
  getRecommendedNextLesson(
    @Request() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    const user = this.ensureUser(req);
    return this.academyClient.send(
      { cmd: 'get_recommended_next_lesson' },
      { user, courseId },
    );
  }

  @Get('course/:courseId/report')
  @ApiOperation({ summary: "Get currently logged-in student's detailed grade/progress report" })
  @ApiParam({ name: 'courseId', type: Number })
  getDetailedCourseReport(
    @Request() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    const user = this.ensureUser(req);
    return this.academyClient.send(
      { cmd: 'get_detailed_student_progress' },
      { user, courseId, targetUserId: user.firebaseId },
    );
  }
}
