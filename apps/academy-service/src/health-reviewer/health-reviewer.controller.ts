import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { HealthReviewerService } from './health-reviewer.service';

@Controller()
@UseGuards(AcademyProfileGuard)
export class HealthReviewerController {
  constructor(private readonly healthReviewerService: HealthReviewerService) {}

  @Get(['health/reviewer/overview', 'academy/health/reviewer/overview'])
  getOverview(@Req() req: any, @Query('cohortId') cohortId?: string) {
    return this.healthReviewerService.getOverview(
      req.user,
      cohortId ? Number(cohortId) : undefined,
      req?.ip,
    );
  }

  @Get(['health/reviewer/program-profile', 'academy/health/reviewer/program-profile'])
  getProgramProfile(@Req() req: any) {
    return this.healthReviewerService.getProgramProfile(req.user, req?.ip);
  }

  @Get(['health/reviewer/curriculum', 'academy/health/reviewer/curriculum'])
  getCurriculumUnits(@Req() req: any, @Query('courseId') courseId?: string) {
    return this.healthReviewerService.getCurriculumUnits(
      req.user,
      courseId ? Number(courseId) : undefined,
      req?.ip,
    );
  }

  @Get(['health/reviewer/units/:moduleId', 'academy/health/reviewer/units/:moduleId'])
  getUnitDetail(
    @Param('moduleId') moduleId: string,
    @Req() req: any,
    @Query('cohortId') cohortId?: string,
  ) {
    return this.healthReviewerService.getUnitDetail(
      Number(moduleId),
      req.user,
      cohortId ? Number(cohortId) : undefined,
      req?.ip,
    );
  }

  @Get(['health/reviewer/cohorts/:cohortId/ratios', 'academy/health/reviewer/cohorts/:cohortId/ratios'])
  getCohortRatios(@Param('cohortId') cohortId: string, @Req() req: any) {
    return this.healthReviewerService.getCohortRatios(Number(cohortId), req.user, req?.ip);
  }

  @Get(['health/reviewer/cohorts/:cohortId/seat-time', 'academy/health/reviewer/cohorts/:cohortId/seat-time'])
  getCohortSeatTime(
    @Param('cohortId') cohortId: string,
    @Req() req: any,
    @Query('masked') masked?: string,
  ) {
    return this.healthReviewerService.getCohortSeatTime(
      Number(cohortId),
      req.user,
      masked === 'true',
      req?.ip,
    );
  }

  @Get(['health/reviewer/cohorts/:cohortId/seat-time/:userId', 'academy/health/reviewer/cohorts/:cohortId/seat-time/:userId'])
  getStudentSeatTimeLog(
    @Param('cohortId') cohortId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.healthReviewerService.getStudentSeatTimeLog(
      Number(cohortId),
      userId,
      req.user,
      req?.ip,
    );
  }

  @Get(['health/reviewer/cohorts/:cohortId/integrity', 'academy/health/reviewer/cohorts/:cohortId/integrity'])
  getCohortIntegrity(@Param('cohortId') cohortId: string, @Req() req: any) {
    return this.healthReviewerService.getCohortIntegrity(Number(cohortId), req.user, req?.ip);
  }

  @Get(['health/reviewer/cohorts/:cohortId/skills', 'academy/health/reviewer/cohorts/:cohortId/skills'])
  getCohortSkills(@Param('cohortId') cohortId: string, @Req() req: any) {
    return this.healthReviewerService.getCohortSkills(Number(cohortId), req.user, req?.ip);
  }

  @Get(['health/reviewer/cohorts/:cohortId/clinical', 'academy/health/reviewer/cohorts/:cohortId/clinical'])
  getCohortClinical(@Param('cohortId') cohortId: string, @Req() req: any) {
    return this.healthReviewerService.getCohortClinical(Number(cohortId), req.user, req?.ip);
  }

  @Get(['health/reviewer/faculty', 'academy/health/reviewer/faculty'])
  getFacultyCredentials(@Req() req: any) {
    return this.healthReviewerService.getFacultyCredentials(req.user, req?.ip);
  }

  @Get(['health/reviewer/facilities', 'academy/health/reviewer/facilities'])
  getClinicalFacilities(@Req() req: any) {
    return this.healthReviewerService.getClinicalFacilities(req.user, req?.ip);
  }

  @Get(['health/reviewer/crosswalk', 'academy/health/reviewer/crosswalk'])
  getRequirementsCrosswalk(@Req() req: any, @Query('cohortId') cohortId?: string) {
    return this.healthReviewerService.getRequirementsCrosswalk(
      req.user,
      cohortId ? Number(cohortId) : undefined,
      req?.ip,
    );
  }

  @Get(['health/reviewer/evidence-locker/export/:type', 'academy/health/reviewer/evidence-locker/export/:type'])
  exportEvidence(
    @Param('type') type: string,
    @Query('cohortId') cohortId: string,
    @Req() req: any,
  ) {
    const cid = Number(cohortId);
    if (!cid || isNaN(cid)) throw new BadRequestException('Valid cohortId query param is required');
    return this.healthReviewerService.exportEvidence(type, cid, req.user, req?.ip);
  }

  @Get(['health/reviewer/requests', 'academy/health/reviewer/requests'])
  listRequests(@Req() req: any) {
    return this.healthReviewerService.listRequests(req.user, req?.ip);
  }

  @Post(['health/reviewer/requests', 'academy/health/reviewer/requests'])
  createRequest(@Body() body: any, @Req() req: any) {
    if (!body?.title) throw new BadRequestException('title is required');
    return this.healthReviewerService.createRequest(body, req.user, req?.ip);
  }

  @Post(['health/reviewer/requests/:id/reply', 'academy/health/reviewer/requests/:id/reply'])
  replyToRequest(
    @Param('id') id: string,
    @Body() body: { body: string },
    @Req() req: any,
  ) {
    if (!body?.body) throw new BadRequestException('reply body is required');
    return this.healthReviewerService.replyToRequest(Number(id), body.body, req.user, req?.ip);
  }

  @Patch(['health/reviewer/requests/:id/status', 'academy/health/reviewer/requests/:id/status'])
  updateRequestStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    return this.healthReviewerService.updateRequestStatus(Number(id), body.status, req.user, req?.ip);
  }
}
