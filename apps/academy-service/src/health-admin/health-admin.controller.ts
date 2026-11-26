import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { HealthAdminService } from './health-admin.service';

@Controller()
@UseGuards(AcademyProfileGuard)
export class HealthAdminController {
  constructor(private readonly healthAdminService: HealthAdminService) {}

  @Get(['health/admin/dashboard', 'academy/health/admin/dashboard'])
  getAdminDashboard(@Req() req: any) {
    return this.healthAdminService.getAdminDashboard(req.user);
  }

  @Get(['health/admin/approvals', 'academy/health/admin/approvals'])
  listApprovals(@Req() req: any) {
    return this.healthAdminService.listApprovals(req.user);
  }

  @Post(['health/admin/approvals', 'academy/health/admin/approvals'])
  createApproval(@Body() body: any, @Req() req: any) {
    return this.healthAdminService.createApproval(body, req.user);
  }

  @Patch(['health/admin/approvals/:id', 'academy/health/admin/approvals/:id'])
  updateApproval(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.healthAdminService.updateApproval(Number(id), body, req.user);
  }

  @Get(['health/admin/program-documents', 'academy/health/admin/program-documents'])
  listProgramDocuments(@Req() req: any) {
    return this.healthAdminService.listProgramDocuments(req.user);
  }

  @Post(['health/admin/program-documents', 'academy/health/admin/program-documents'])
  createProgramDocument(@Body() body: any, @Req() req: any) {
    return this.healthAdminService.createProgramDocument(body, req.user);
  }

  @Delete(['health/admin/program-documents/:id', 'academy/health/admin/program-documents/:id'])
  deleteProgramDocument(@Param('id') id: string, @Req() req: any) {
    return this.healthAdminService.deleteProgramDocument(Number(id), req.user);
  }

  @Post(['health/admin/cleanup/archive-courses', 'academy/health/admin/cleanup/archive-courses'])
  archiveCourses(@Body() body: { courseIds: number[] }, @Req() req: any) {
    if (!Array.isArray(body?.courseIds) || body.courseIds.length === 0) {
      throw new BadRequestException('courseIds array is required');
    }
    return this.healthAdminService.archiveCourses(body.courseIds.map(Number), req.user);
  }

  @Get(['health/admin/content-library', 'academy/health/admin/content-library'])
  getContentLibrary(@Req() req: any, @Query('courseId') courseId?: string) {
    return this.healthAdminService.getContentLibrary(
      req.user,
      courseId ? Number(courseId) : undefined,
    );
  }

  @Get(['health/admin/reviewers', 'academy/health/admin/reviewers'])
  listReviewers(@Req() req: any) {
    return this.healthAdminService.listReviewers(req.user);
  }

  @Post(['health/admin/reviewers', 'academy/health/admin/reviewers'])
  inviteReviewer(@Body() body: any, @Req() req: any) {
    return this.healthAdminService.inviteReviewer(body, req.user);
  }

  @Patch(['health/admin/reviewers/:id/status', 'academy/health/admin/reviewers/:id/status'])
  updateReviewerStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    return this.healthAdminService.updateReviewerStatus(Number(id), body.status, req.user);
  }

  @Post(['health/admin/reviewers/:id/audit-log', 'academy/health/admin/reviewers/:id/audit-log'])
  logReviewerAction(
    @Param('id') id: string,
    @Body() body: { action: string; resource: string },
    @Req() req: any,
  ) {
    return this.healthAdminService.logReviewerAction(
      Number(id),
      body.action,
      body.resource,
      req?.ip,
    );
  }

  @Get(['health/admin/reviewers/audit-log', 'academy/health/admin/reviewers/audit-log'])
  getReviewerAuditLogs(@Req() req: any, @Query('reviewerId') reviewerId?: string) {
    return this.healthAdminService.getReviewerAuditLogs(
      req.user,
      reviewerId ? Number(reviewerId) : undefined,
    );
  }

  @Get(['health/admin/refunds', 'academy/health/admin/refunds'])
  listRefunds(@Req() req: any) {
    return this.healthAdminService.listRefunds(req.user);
  }

  @Post(['health/admin/refunds', 'academy/health/admin/refunds'])
  createRefundRequest(@Body() body: any, @Req() req: any) {
    return this.healthAdminService.createRefundRequest(body, req.user);
  }

  @Patch(['health/admin/refunds/:id', 'academy/health/admin/refunds/:id'])
  reviewRefundRequest(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    return this.healthAdminService.reviewRefundRequest(Number(id), body.status, req.user);
  }

  @Get(['health/admin/analytics', 'academy/health/admin/analytics'])
  getHealthAnalytics(@Req() req: any) {
    return this.healthAdminService.getHealthAnalytics(req.user);
  }
}
