import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Inject,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { AuthGuard as JwtAuthGuard } from '../common/guard/firebase_auth.guard';
import { ConshifterRoleGuard } from './conshifter-role.guard';
import { Roles } from '../common/roles/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../file-upload-service/file-upload.service';

@ApiTags('Conshifter')
@Controller('conshifter')
export class ConshifterController {
  constructor(
    @Inject('CONSHIFTER_SERVICE') private readonly conshifterClient: ClientProxy,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // ================= Events =================
  @Get('events')
  @ApiOperation({ summary: 'Get all active events' })
  async findAllEvents() {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_events' }, {}));
  }

  @Get('events/upcoming')
  @ApiOperation({ summary: 'Get upcoming events' })
  async findUpcomingEvents() {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_upcoming_events' }, {}));
  }

  @Get('events/:slug')
  @ApiOperation({ summary: 'Get a specific event by slug' })
  async findOneEvent(@Param('slug') slug: string) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_one_event_by_slug' }, { slug }));
  }

  @Post('events/:slug/register')
  @ApiOperation({ summary: 'Register for an event' })
  async registerForEvent(@Param('slug') slug: string, @Body() data: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'register_for_event' }, { slug, data }));
  }

  @Post('admin/events')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create an event (Admin only)' })
  async createEvent(@Body() dto: any, @Req() req: any, @UploadedFile() image?: Express.Multer.File) {
    if (image) {
      const uploadResult = await this.fileUploadService.uploadFile(image, 'image');
      dto.imageUrl = uploadResult.url;
    }
    
    if (dto.isVirtual !== undefined) dto.isVirtual = dto.isVirtual === 'true' || dto.isVirtual === true;
    if (dto.isFeatured !== undefined) dto.isFeatured = dto.isFeatured === 'true' || dto.isFeatured === true;
    if (dto.startDate) dto.startDate = new Date(dto.startDate);
    if (dto.endDate) dto.endDate = new Date(dto.endDate);

    return firstValueFrom(this.conshifterClient.send({ cmd: 'create_event' }, { dto, user: req.user }));
  }

  @Put('admin/events/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update an event (Admin only)' })
  async updateEvent(@Param('id') id: string, @Body() dto: any, @Req() req: any, @UploadedFile() image?: Express.Multer.File) {
    if (image) {
      const uploadResult = await this.fileUploadService.uploadFile(image, 'image');
      dto.imageUrl = uploadResult.url;
    }

    if (dto.isVirtual !== undefined) dto.isVirtual = dto.isVirtual === 'true' || dto.isVirtual === true;
    if (dto.isFeatured !== undefined) dto.isFeatured = dto.isFeatured === 'true' || dto.isFeatured === true;
    if (dto.startDate) dto.startDate = new Date(dto.startDate);
    if (dto.endDate) dto.endDate = new Date(dto.endDate);

    return firstValueFrom(this.conshifterClient.send({ cmd: 'update_event' }, { id, dto, user: req.user }));
  }

  @Delete('admin/events/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event (Admin only)' })
  async removeEvent(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'remove_event' }, { id, user: req.user }));
  }

  @Get('admin/events/:id/attendees')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get attendees for an event (Admin only)' })
  async getEventAttendees(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'get_event_attendees' }, { id, user: req.user }));
  }

  // ================= Organizations =================
  @Get('organizations')
  @ApiOperation({ summary: 'Get all approved organizations' })
  async findAllOrganizations() {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_organizations' }, {}));
  }

  @Get('organizations/:slug')
  @ApiOperation({ summary: 'Get an organization by slug' })
  async findOneOrganization(@Param('slug') slug: string) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_one_organization_by_slug' }, { slug }));
  }

  @Post('organizations')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit an organization publicly' })
  async createOrganizationPublic(@Body() dto: any, @UploadedFile() logo?: Express.Multer.File) {
    if (logo) {
      const uploadResult = await this.fileUploadService.uploadFile(logo, 'image');
      dto.logoUrl = uploadResult.url;
    }
    if (dto.focusTags && typeof dto.focusTags === 'string') {
      try { dto.focusTags = JSON.parse(dto.focusTags); } catch (e) { dto.focusTags = dto.focusTags.split(',').map((t: string) => t.trim()); }
    }
    return firstValueFrom(this.conshifterClient.send({ cmd: 'create_organization_public' }, { dto }));
  }

  @Get('admin/organizations')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all organizations (Admin only)' })
  async findAllOrganizationsAdmin(@Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_organizations_admin' }, { user: req.user }));
  }

  @Put('organizations/:id/status')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization status (Admin only)' })
  async updateOrganizationStatus(@Param('id') id: string, @Body('status') status: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'update_organization_status' }, { id, status, user: req.user }));
  }

  @Delete('organizations/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an organization (Admin only)' })
  async removeOrganization(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'remove_organization' }, { id, user: req.user }));
  }

  // ================= Programs =================
  @Get('programs')
  @ApiOperation({ summary: 'Get all active programs' })
  async findAllPrograms() {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_programs' }, {}));
  }

  @Get('admin/programs')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all programs (Admin only)' })
  async findAllProgramsAdmin(@Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_programs_admin' }, { user: req.user }));
  }

  @Get('admin/programs/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a program detail with applications (Admin only)' })
  async findOneProgramAdmin(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_one_program_admin' }, { id, user: req.user }));
  }

  @Post('programs')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('icon'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a program (Admin only)' })
  async createProgram(@Body() dto: any, @Req() req: any, @UploadedFile() icon?: Express.Multer.File) {
    if (icon) {
      const uploadResult = await this.fileUploadService.uploadFile(icon, 'image');
      dto.icon = uploadResult.url;
    }
    if (dto.isActive !== undefined) dto.isActive = dto.isActive === 'true' || dto.isActive === true;
    if (dto.orderIndex !== undefined) dto.orderIndex = parseInt(dto.orderIndex, 10);
    return firstValueFrom(this.conshifterClient.send({ cmd: 'create_program' }, { dto, user: req.user }));
  }

  @Put('programs/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('icon'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a program (Admin only)' })
  async updateProgram(@Param('id') id: string, @Body() dto: any, @Req() req: any, @UploadedFile() icon?: Express.Multer.File) {
    if (icon) {
      const uploadResult = await this.fileUploadService.uploadFile(icon, 'image');
      dto.icon = uploadResult.url;
    }
    if (dto.isActive !== undefined) dto.isActive = dto.isActive === 'true' || dto.isActive === true;
    if (dto.orderIndex !== undefined) dto.orderIndex = parseInt(dto.orderIndex, 10);
    return firstValueFrom(this.conshifterClient.send({ cmd: 'update_program' }, { id, dto, user: req.user }));
  }

  @Delete('programs/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a program (Admin only)' })
  async removeProgram(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'remove_program' }, { id, user: req.user }));
  }

  // ================= Partners =================
  @Get('partners')
  @ApiOperation({ summary: 'Get all partners' })
  async findAllPartners() {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_partners' }, {}));
  }

  @Post('partners')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a partner (Admin only)' })
  async createPartner(@Body() dto: any, @Req() req: any, @UploadedFile() logo?: Express.Multer.File) {
    if (logo) {
      const uploadResult = await this.fileUploadService.uploadFile(logo, 'image');
      dto.logoUrl = uploadResult.url;
    }
    if (dto.orderIndex !== undefined) dto.orderIndex = parseInt(dto.orderIndex, 10);
    return firstValueFrom(this.conshifterClient.send({ cmd: 'create_partner' }, { dto, user: req.user }));
  }

  @Put('partners/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a partner (Admin only)' })
  async updatePartner(@Param('id') id: string, @Body() dto: any, @Req() req: any, @UploadedFile() logo?: Express.Multer.File) {
    if (logo) {
      const uploadResult = await this.fileUploadService.uploadFile(logo, 'image');
      dto.logoUrl = uploadResult.url;
    }
    if (dto.orderIndex !== undefined) dto.orderIndex = parseInt(dto.orderIndex, 10);
    return firstValueFrom(this.conshifterClient.send({ cmd: 'update_partner' }, { id, dto, user: req.user }));
  }

  @Delete('partners/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a partner (Admin only)' })
  async removePartner(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'remove_partner' }, { id, user: req.user }));
  }

  // ================= Testimonials =================
  @Get('testimonials')
  @ApiOperation({ summary: 'Get all featured testimonials' })
  async findAllTestimonials() {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_testimonials' }, {}));
  }

  @Get('admin/testimonials')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all testimonials (Admin only)' })
  async findAllTestimonialsAdmin(@Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_testimonials_admin' }, { user: req.user }));
  }

  @Post('testimonials')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('authorImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a testimonial (Admin only)' })
  async createTestimonial(@Body() dto: any, @Req() req: any, @UploadedFile() authorImage?: Express.Multer.File) {
    if (authorImage) {
      const uploadResult = await this.fileUploadService.uploadFile(authorImage, 'image');
      dto.authorImageUrl = uploadResult.url;
    }
    if (dto.isFeatured !== undefined) dto.isFeatured = dto.isFeatured === 'true' || dto.isFeatured === true;
    if (dto.orderIndex !== undefined) dto.orderIndex = parseInt(dto.orderIndex, 10);
    return firstValueFrom(this.conshifterClient.send({ cmd: 'create_testimonial' }, { dto, user: req.user }));
  }

  @Put('testimonials/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('authorImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a testimonial (Admin only)' })
  async updateTestimonial(@Param('id') id: string, @Body() dto: any, @Req() req: any, @UploadedFile() authorImage?: Express.Multer.File) {
    if (authorImage) {
      const uploadResult = await this.fileUploadService.uploadFile(authorImage, 'image');
      dto.authorImageUrl = uploadResult.url;
    }
    if (dto.isFeatured !== undefined) dto.isFeatured = dto.isFeatured === 'true' || dto.isFeatured === true;
    if (dto.orderIndex !== undefined) dto.orderIndex = parseInt(dto.orderIndex, 10);
    return firstValueFrom(this.conshifterClient.send({ cmd: 'update_testimonial' }, { id, dto, user: req.user }));
  }

  @Delete('testimonials/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a testimonial (Admin only)' })
  async removeTestimonial(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'remove_testimonial' }, { id, user: req.user }));
  }

  // ================= Stats =================
  @Get('stats')
  @ApiOperation({ summary: 'Get all stats' })
  async findAllStats() {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_stats' }, {}));
  }

  @Post('stats')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a stat (Admin only)' })
  async createStat(@Body() dto: any, @Req() req: any) {
    if (dto.orderIndex !== undefined) dto.orderIndex = parseInt(dto.orderIndex, 10);
    return firstValueFrom(this.conshifterClient.send({ cmd: 'create_stat' }, { dto, user: req.user }));
  }

  @Put('stats/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a stat (Admin only)' })
  async updateStat(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    if (dto.orderIndex !== undefined) dto.orderIndex = parseInt(dto.orderIndex, 10);
    return firstValueFrom(this.conshifterClient.send({ cmd: 'update_stat' }, { id, dto, user: req.user }));
  }

  @Delete('stats/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a stat (Admin only)' })
  async removeStat(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'remove_stat' }, { id, user: req.user }));
  }

  // ================= Subscriptions =================
  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to newsletter' })
  async subscribeNewsletter(@Body() dto: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'subscribe_newsletter' }, { dto }));
  }

  @Get('admin/subscribers')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all subscribers (Admin only)' })
  async findAllSubscribers(@Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_subscribers' }, { user: req.user }));
  }

  // ================= Applications =================
  @Post('applications')
  @ApiOperation({ summary: 'Submit membership application' })
  async createApplication(@Body() dto: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'create_application' }, { dto }));
  }

  @Get('admin/applications')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all applications (Admin only)' })
  async findAllApplications(@Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'find_all_applications' }, { user: req.user }));
  }

  @Put('admin/applications/:id/status')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update application status (Admin only)' })
  async updateApplicationStatus(@Param('id') id: string, @Body('status') status: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'update_application_status' }, { id, status, user: req.user }));
  }

  @Delete('admin/applications/:id')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an application (Admin only)' })
  async removeApplication(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'remove_application' }, { id, user: req.user }));
  }

  // ================= Dashboard =================
  @Get('admin/dashboard/counts')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard aggregate counts (Admin only)' })
  async getDashboardCounts(@Req() req: any) {
    return firstValueFrom(this.conshifterClient.send({ cmd: 'get_dashboard_counts' }, { user: req.user }));
  }

  // ================= File Upload =================
  @Post('upload')
  @UseGuards(JwtAuthGuard, ConshifterRoleGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['image', 'video', 'document'] },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: 'image' | 'video' | 'document' = 'image',
  ) {
    return this.fileUploadService.uploadFile(file, type);
  }
}
