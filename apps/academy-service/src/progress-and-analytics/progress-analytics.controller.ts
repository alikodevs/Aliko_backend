import { Controller, UseGuards, UsePipes, Logger, Get, Post, Param, Req, UnauthorizedException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProgressAndAnalyticsService } from './progress-analytics.service';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  UserOnlyProgressSchema,
  UserProgressSchema,
  CourseAnalyticsSchema,
  CompleteLessonSchema,
  UpdateContentProgressSchema,
} from './progress-analytics.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class ProgressAndAnalyticsController {
  private readonly logger = new Logger(ProgressAndAnalyticsController.name);
  constructor(private readonly service: ProgressAndAnalyticsService) {}

  @Get([
    'progress/instructor/stats',
    'academy/progress/instructor/stats',
  ])
  @MessagePattern({ cmd: 'get_instructor_stats' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  async instructorStats(
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Instructor ${user.firebaseId} fetching their platform stats`,
    );
    try {
      return await this.service.getInstructorStats(user);
    } catch (error) {
      this.logger.error(
        `Instructor ${user.firebaseId} failed to fetch platform stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get([
    'progress/course/:courseId/user/:targetUserId',
    'academy/progress/course/:courseId/user/:targetUserId',
  ])
  @MessagePattern({ cmd: 'get_user_progress' })
  async userProgress(
    @Param('courseId') paramCourseId?: string,
    @Param('targetUserId') paramTargetUserId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      targetUserId: string;
      courseId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const courseId = Number(rawCourseId);
    const targetUserId = payload?.targetUserId || paramTargetUserId;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching progress of student ${targetUserId} in course ${courseId} (requested by: ${user.firebaseId})`,
    );
    try {
      return await this.service.getUserProgress(
        user,
        targetUserId,
        courseId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch progress of student ${targetUserId} in course ${courseId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get([
    'progress/course/:courseId/analytics',
    'academy/progress/course/:courseId/analytics',
  ])
  @MessagePattern({ cmd: 'get_course_analytics' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  async courseAnalytics(
    @Param('courseId') paramCourseId?: string,
    @Req() req?: any,
    @Payload() payload?: { courseId: number; user: AuthenticatedUser },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const courseId = Number(rawCourseId);
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching aggregate analytics for course ID: ${courseId} by: ${user.firebaseId}`,
    );
    try {
      return await this.service.getCourseAnalytics(
        courseId,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch aggregate analytics for course ID ${courseId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post([
    'progress/course/:courseId/lesson/:lessonId/complete',
    'academy/progress/course/:courseId/lesson/:lessonId/complete',
  ])
  @MessagePattern({ cmd: 'complete_lesson' })
  @UseGuards(RoleGuard)
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN', 'USER')
  async completeLesson(
    @Param('courseId') paramCourseId?: string,
    @Param('lessonId') paramLessonId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      courseId: number;
      lessonId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const rawLessonId = payload?.lessonId !== undefined ? payload.lessonId : paramLessonId;
    const courseId = Number(rawCourseId);
    const lessonId = Number(rawLessonId);
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Student ${user.firebaseId} marking lesson ${lessonId} in course ${courseId} as complete`,
    );
    try {
      return await this.service.completeLesson(user, courseId, lessonId);
    } catch (error) {
      this.logger.error(
        `Student ${user.firebaseId} failed to mark lesson ${lessonId} in course ${courseId} as complete: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get([
    'progress/course/:courseId/lesson/:lessonId/complete',
    'academy/progress/course/:courseId/lesson/:lessonId/complete',
  ])
  @MessagePattern({ cmd: 'get_lesson_status' })
  @UseGuards(RoleGuard)
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN', 'USER')
  async getLessonStatus(
    @Param('courseId') paramCourseId?: string,
    @Param('lessonId') paramLessonId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      courseId: number;
      lessonId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const rawLessonId = payload?.lessonId !== undefined ? payload.lessonId : paramLessonId;
    const courseId = Number(rawCourseId);
    const lessonId = Number(rawLessonId);
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Student ${user.firebaseId} fetching status for lesson ${lessonId} in course ${courseId}`,
    );
    try {
      return await this.service.getLessonStatus(user, courseId, lessonId);
    } catch (error) {
      this.logger.error(
        `Student ${user.firebaseId} failed to fetch status for lesson ${lessonId} in course ${courseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get([
    'progress/course/:courseId/report',
    'academy/progress/course/:courseId/report',
  ])
  @MessagePattern({ cmd: 'get_course_report' })
  @UseGuards(RoleGuard)
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN', 'USER')
  async getCourseReport(
    @Param('courseId') paramCourseId?: string,
    @Req() req?: any,
    @Payload() payload?: { courseId: number; user: AuthenticatedUser },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const courseId = Number(rawCourseId);
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `Fetching progress report for course ${courseId} by user: ${user.firebaseId}`,
    );
    try {
      return await this.service.getCourseReport(courseId, user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch progress report for course ${courseId} by user ${user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['progress/dashboard', 'academy/progress/dashboard'])
  @MessagePattern({ cmd: 'get_my_dashboard' })
  @UseGuards(RoleGuard)
  @Roles('STUDENT', 'USER', 'INSTRUCTOR', 'ADMIN')
  async myCoursesProgress(
    @Payload() payload?: { user: AuthenticatedUser },
    @Req() req?: any,
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `User ${user.firebaseId} fetching their dashboard progress`,
    );
    try {
      return await this.service.getStudentDashboard(user);
    } catch (error) {
      this.logger.error(
        `User ${user.firebaseId} failed to fetch dashboard progress: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_students_progress_for_course' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(CourseAnalyticsSchema))
  async studentsProgress(
    @Payload() payload: { courseId: number; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Instructor ${payload.user.firebaseId} fetching progress for all students in course ${payload.courseId}`,
    );
    try {
      return await this.service.getStudentsProgressForCourse(
        payload.user,
        payload.courseId,
      );
    } catch (error) {
      this.logger.error(
        `Instructor ${payload.user.firebaseId} failed to fetch student progress for course ${payload.courseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_overall_analytics' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @UsePipes(new JoiValidationPipe(UserOnlyProgressSchema))
  async overallAnalytics(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(
      `Admin ${payload.user.firebaseId} fetching overall platform analytics`,
    );
    try {
      return await this.service.getOverallPlatformAnalytics(payload.user);
    } catch (error) {
      this.logger.error(
        `Admin ${payload.user.firebaseId} failed to fetch overall platform analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_content_progress' })
  @UseGuards(RoleGuard)
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN', 'USER')
  @UsePipes(new JoiValidationPipe(UpdateContentProgressSchema))
  async updateContentProgress(
    @Payload()
    payload: {
      courseId: number;
      moduleId: number;
      lessonId: number;
      contentId: number;
      status: string;
      score?: number;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Student ${payload.user.firebaseId} updating progress for content ${payload.contentId} in course ${payload.courseId} to: ${payload.status}`,
    );
    try {
      return await this.service.updateContentProgress(
        payload.user,
        payload.courseId,
        payload.moduleId,
        payload.lessonId,
        payload.contentId,
        payload.status,
        payload.score,
      );
    } catch (error) {
      this.logger.error(
        `Student ${payload.user.firebaseId} failed to update progress for content ${payload.contentId} in course ${payload.courseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_detailed_student_progress' })
  @UsePipes(new JoiValidationPipe(UserProgressSchema))
  async getDetailedStudentProgress(
    @Payload()
    payload: {
      targetUserId: string;
      courseId: number;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Fetching detailed progress of student ${payload.targetUserId} in course ${payload.courseId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.service.getDetailedStudentProgress(
        payload.user,
        payload.targetUserId,
        payload.courseId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch detailed progress of student ${payload.targetUserId} in course ${payload.courseId} by user ${payload.user.firebaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_instructor_dashboard' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(UserOnlyProgressSchema))
  async getInstructorDashboard(
    @Payload() payload: { user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Instructor ${payload.user.firebaseId} fetching their dashboard overview`,
    );
    try {
      return await this.service.getInstructorDashboard(payload.user);
    } catch (error) {
      this.logger.error(
        `Instructor ${payload.user.firebaseId} failed to fetch dashboard overview: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(['progress/analytics/student', 'academy/progress/analytics/student'])
  @MessagePattern({ cmd: 'get_student_stats' })
  @UseGuards(RoleGuard)
  @Roles('STUDENT', 'USER', 'INSTRUCTOR', 'ADMIN')
  async getStudentStats(
    @Payload() payload?: { user: AuthenticatedUser },
    @Req() req?: any,
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `User ${user.firebaseId} fetching their sidebar stats`,
    );
    try {
      return await this.service.getStudentStats(user);
    } catch (error) {
      this.logger.error(
        `User ${user.firebaseId} failed to fetch stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_recommended_next_lesson' })
  @UseGuards(RoleGuard)
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN', 'USER')
  async getRecommendedNextLesson(
    @Payload() payload: { courseId: number; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Fetching recommended next lesson for user ${payload.user.firebaseId} in course ${payload.courseId}`,
    );
    try {
      return await this.service.getRecommendedNextLesson(
        payload.user,
        payload.courseId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch recommended next lesson for user ${payload.user.firebaseId} in course ${payload.courseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
