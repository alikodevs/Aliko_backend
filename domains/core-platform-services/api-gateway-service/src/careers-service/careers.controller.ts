import { Controller, Get, Post, Body, Param, UseGuards, Request, Inject, Patch, Delete, UseInterceptors, UploadedFile, Put, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { AuthGuard } from '../common/guard/firebase_auth.guard';
import { AdminAccessGuard } from '../common/guard/admin-access.guard';
import { CareersRoleGuard } from '../common/roles/careers-role.guard';
import { CareersRoles } from '../common/roles/careers-roles.decorator';
import { CreateJobDto } from './dto/create-job.dto';
import { ApplyJobDto } from './dto/apply-job.dto';
import { CreateRecruiterDto } from './dto/create-recruiter.dto';
import { Public } from '../common/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../file-upload-service/file-upload.service';

@ApiTags('Careers')
@ApiBearerAuth()
@Controller('careers')
@UseGuards(AuthGuard)
export class CareersController {
  constructor(
    @Inject('CAREERS_SERVICE') private readonly careersClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post('admin/recruiters')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: 'Admin: Create a new recruiter account' })
  async createRecruiter(@Body() createRecruiterDto: CreateRecruiterDto) {
    const { department, ...authData } = createRecruiterDto;
    
    // 1. Create Recruiter User in Auth Service
    const authResponse = await firstValueFrom(
      this.authClient.send({ cmd: 'create_recruiter' }, authData)
    );

    const userId = authResponse.user.firebaseId;

    // 2. Create Recruiter Profile in Careers Service
    await firstValueFrom(
      this.careersClient.send({ cmd: 'create_recruiter_profile' }, { 
        userId, 
        profileData: { department, isPrimaryRecruiter: false } 
      })
    );

    return {
      message: 'Recruiter created and profile initialized successfully',
      user: authResponse.user
    };
  }

  @Patch('admin/recruiters/:id/role')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: 'Admin: Update a user careers role' })
  async updateRecruiterRole(@Param('id') id: string, @Body() data: { role: string }) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'update_careers_role' }, { userId: id, role: data.role })
    );
  }

  @Post('jobs')
  @UseGuards(CareersRoleGuard)
  @CareersRoles('RECRUITER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new job posting (Recruiter/Admin)' })
  async createJob(@Request() req: any, @Body() createJobDto: CreateJobDto) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'create_job' }, { jobData: createJobDto, userId: req.user.firebaseId })
    );
  }

  @Public()
  @Get('jobs')
  @ApiOperation({ summary: 'Get all open job postings' })
  async getAllJobs(@Request() req: any) {
    const filters = req.query;
    return firstValueFrom(
      this.careersClient.send({ cmd: 'get_all_jobs' }, filters)
    );
  }

  @Public()
  @Get('ventures')
  @ApiOperation({ summary: 'Get all ventures' })
  async getAllVentures() {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'get_all_ventures' }, {})
    );
  }

  @Public()
  @Get('ventures/:idOrSlug')
  @ApiOperation({ summary: 'Get venture details' })
  async getVentureBySlug(@Param('idOrSlug') idOrSlug: string) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'get_venture_by_slug' }, idOrSlug)
    );
  }

  @Public()
  @Get('companies')
  @ApiOperation({ summary: 'Get all partner companies' })
  async getAllCompanies() {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'get_all_companies' }, {})
    );
  }

  @Public()
  @Get('companies/:idOrSlug')
  @ApiOperation({ summary: 'Get company details' })
  async getCompanyBySlug(@Param('idOrSlug') idOrSlug: string) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'get_company_by_slug' }, idOrSlug)
    );
  }

  @Post('ventures')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: 'Admin: Create new venture' })
  async createVenture(@Body() data: any) {
    return firstValueFrom(this.careersClient.send({ cmd: 'create_venture' }, data));
  }

  @Put('ventures/:id')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: 'Admin: Update venture' })
  async updateVenture(@Param('id') id: string, @Body() data: any) {
    return firstValueFrom(this.careersClient.send({ cmd: 'update_venture' }, { id, ...data }));
  }

  @Delete('ventures/:id')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: 'Admin: Delete venture' })
  async deleteVenture(@Param('id') id: string) {
    return firstValueFrom(this.careersClient.send({ cmd: 'delete_venture' }, id));
  }

  @Post('companies')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: 'Admin: Create new partner company' })
  async createCompany(@Body() data: any) {
    return firstValueFrom(this.careersClient.send({ cmd: 'create_company' }, data));
  }

  @Put('companies/:id')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: 'Admin: Update company' })
  async updateCompany(@Param('id') id: string, @Body() data: any) {
    return firstValueFrom(this.careersClient.send({ cmd: 'update_company' }, { id, ...data }));
  }

  @Delete('companies/:id')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: 'Admin: Delete company' })
  async deleteCompany(@Param('id') id: string) {
    return firstValueFrom(this.careersClient.send({ cmd: 'delete_company' }, id));
  }

  @Public()
  @Post('community/join')
  @ApiOperation({ summary: 'Join the talent community' })
  async joinCommunity(@Body() data: any) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'join_community' }, data)
    );
  }

  @Public()
  @Post('contact')
  @ApiOperation({ summary: 'Submit a contact form' })
  async submitContact(@Body() data: any) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'submit_contact' }, data)
    );
  }


  @Get('applications')
  @ApiOperation({ summary: 'Get current user applications' })
  async getMyApplications(@Request() req: any) {
    return firstValueFrom(
      this.careersClient.send('careers.applications.findAllByUser', req.user.firebaseId)
    );
  }

  // --- Admin Endpoints ---
  @Get('applications/all')
  @ApiOperation({ summary: 'Admin: Get all job applications' })
  @UseGuards(AdminAccessGuard)
  async getAllApplications() {
    return firstValueFrom(this.careersClient.send('careers.applications.findAll', {}));
  }

  @Put('applications/:id/status')
  @ApiOperation({ summary: 'Admin: Update job application status' })
  @UseGuards(AdminAccessGuard)
  async updateApplicationStatus(@Param('id') id: string, @Body() data: { status: string; adminNotes?: string }) {
    return firstValueFrom(this.careersClient.send('careers.applications.updateStatus', { id: parseInt(id), ...data }));
  }

  @Get('community/members')
  @ApiOperation({ summary: 'Admin: Get all community members' })
  @UseGuards(AdminAccessGuard)
  async getCommunityMembers() {
    return firstValueFrom(this.careersClient.send({ cmd: 'get_community_members' }, {}));
  }

  @Get('contact/submissions')
  @ApiOperation({ summary: 'Admin: Get all contact submissions' })
  @UseGuards(AdminAccessGuard)
  async getContactSubmissions() {
    return firstValueFrom(this.careersClient.send({ cmd: 'get_contact_submissions' }, {}));
  }

  @Put('contact/submissions/:id/read')
  @ApiOperation({ summary: 'Admin: Mark contact submission as read' })
  @UseGuards(AdminAccessGuard)
  async markContactRead(@Param('id') id: string) {
    return firstValueFrom(this.careersClient.send({ cmd: 'mark_contact_as_read' }, id));
  }

  @Public()
  @Get('content')
  @ApiOperation({ summary: 'Get all blog/articles' })
  async getAllContent(@Query('all') all?: string) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'get_all_content' }, { all })
    );
  }

  @Public()
  @Get('content/:slug')
  @ApiOperation({ summary: 'Get content details' })
  async getContentBySlug(@Param('slug') slug: string) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'get_content_by_slug' }, slug)
    );
  }

  @Post('content')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: 'Admin: Create new content section' })
  async createContent(@Body() data: any) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'create_content' }, data)
    );
  }

  @Put('content/:id')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: 'Admin: Update existing content section' })
  async updateContent(@Param('id') id: string, @Body() data: any) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'update_content' }, { id, ...data })
    );
  }

  @Public()
  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job details by ID' })
  async getJobById(@Param('id') id: string) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'get_job_by_id' }, parseInt(id))
    );
  }

  @Patch('jobs/:id')
  @UseGuards(CareersRoleGuard)
  @CareersRoles('RECRUITER', 'ADMIN')
  @ApiOperation({ summary: 'Update a job posting (Recruiter/Admin)' })
  async updateJob(@Request() req: any, @Param('id') id: string, @Body() updateJobDto: any) {
    const isAdmin = req.user.globalRole === 'ADMIN' || req.user.careersRole === 'ADMIN';
    return firstValueFrom(
      this.careersClient.send({ cmd: 'update_job' }, { 
        id: parseInt(id), 
        jobData: updateJobDto, 
        userId: req.user.firebaseId,
        isAdmin 
      })
    );
  }

  @Delete('jobs/:id')
  @UseGuards(CareersRoleGuard)
  @CareersRoles('RECRUITER', 'ADMIN')
  @ApiOperation({ summary: 'Delete a job posting (Recruiter/Admin)' })
  async deleteJob(@Request() req: any, @Param('id') id: string) {
    const isAdmin = req.user.globalRole === 'ADMIN' || req.user.careersRole === 'ADMIN';
    return firstValueFrom(
      this.careersClient.send({ cmd: 'delete_job' }, { 
        id: parseInt(id), 
        userId: req.user.firebaseId,
        isAdmin 
      })
    );
  }

  @Post('jobs/:id/apply')
  @UseInterceptors(FileInterceptor('resume'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Apply to a job' })
  async applyJob(
    @Request() req: any, 
    @Param('id') id: string, 
    @Body() applyJobDto: ApplyJobDto,
    @UploadedFile() resume?: Express.Multer.File,
  ) {
    if (resume) {
      const uploadResult = await this.fileUploadService.uploadFile(resume, 'document');
      applyJobDto.resumeUrl = uploadResult.url;
    } else if (applyJobDto.resume && typeof applyJobDto.resume === 'string') {
      applyJobDto.resumeUrl = applyJobDto.resume;
    }

    // Clean up applyJobDto to remove file objects before sending to careers-service
    const cleanData = { ...applyJobDto };
    delete cleanData.resume;

    return firstValueFrom(
      this.careersClient.send({ cmd: 'apply_job' }, { 
        jobId: parseInt(id), 
        user: req.user,
        applicationData: cleanData
      })
    );
  }

  @Get('jobs/:id/applications')
  @UseGuards(CareersRoleGuard)
  @CareersRoles('RECRUITER', 'ADMIN')
  @ApiOperation({ summary: 'Get applications for a job (Recruiter/Admin)' })
  async getJobApplications(@Param('id') id: string) {
    return firstValueFrom(
      this.careersClient.send({ cmd: 'get_job_applications' }, parseInt(id))
    );
  }
}
