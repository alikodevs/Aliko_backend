import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { HealthDashboardService } from './health-dashboard.service';

@Controller()
@UseGuards(AcademyProfileGuard)
export class HealthDashboardController {
  constructor(private readonly healthDashboardService: HealthDashboardService) {}

  @Get(['health/student/dashboard', 'academy/health/student/dashboard'])
  async getStudentDashboard(@Req() req: any, @Query('courseId') courseId?: string) {
    const user = req?.user;
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.healthDashboardService.getStudentDashboard(
      user,
      courseId ? Number(courseId) : undefined,
    );
  }

  @Get(['health/grades/unit-summary/:userId', 'academy/health/grades/unit-summary/:userId'])
  async getUnitGradeSummary(
    @Param('userId') userId: string,
    @Req() req: any,
    @Query('courseId') courseId?: string,
  ) {
    const user = req?.user;
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.healthDashboardService.getUnitGradeSummary(
      userId,
      user,
      courseId ? Number(courseId) : undefined,
    );
  }

  @Get(['health/schedule/cohort/:cohortId', 'academy/health/schedule/cohort/:cohortId'])
  async getCohortSchedule(@Param('cohortId') rawCohortId: string, @Req() req: any) {
    const user = req?.user;
    if (!user) throw new UnauthorizedException('Authentication required');
    const cohortId = Number(rawCohortId);
    if (!cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Valid cohortId is required');
    }
    return this.healthDashboardService.getCohortSchedule(cohortId, user);
  }

  @Get(['health/instructor/dashboard', 'academy/health/instructor/dashboard'])
  async getInstructorDashboard(@Req() req: any, @Query('cohortId') cohortId?: string) {
    const user = req?.user;
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.healthDashboardService.getInstructorDashboard(
      user,
      cohortId ? Number(cohortId) : undefined,
    );
  }

  @Get(['health/instructor/submissions/queue', 'academy/health/instructor/submissions/queue'])
  async getSubmissionsQueue(@Req() req: any, @Query('courseId') courseId?: string) {
    const user = req?.user;
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.healthDashboardService.getSubmissionsQueue(
      user,
      courseId ? Number(courseId) : undefined,
    );
  }

  @Get([
    'health/instructor/audit/:cohortId',
    'academy/health/instructor/audit/:cohortId',
    'compliance/audit/:cohortId',
    'academy/compliance/audit/:cohortId',
  ])
  async getCohortComplianceAudit(@Param('cohortId') rawCohortId: string, @Req() req: any) {
    const user = req?.user;
    if (!user) throw new UnauthorizedException('Authentication required');
    const cohortId = Number(rawCohortId);
    if (!cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Valid cohortId is required');
    }
    return this.healthDashboardService.getCohortComplianceAudit(cohortId, user);
  }
}
