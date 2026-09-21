import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Delete,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';
import { AuthGuard } from '../common/guard/firebase_auth.guard';
import { RoleGuard } from '../common/roles/roles.guard';
import { Roles } from '../common/roles/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { FileUploadService } from '../file-upload-service/file-upload.service';

@Controller('consultancy')
@UseGuards(AuthGuard, RoleGuard)
export class ConsultancyController {
  constructor(
    @Inject('CONSULTANCY_SERVICE') private readonly client: ClientProxy,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // --- Profile ---
  @Public()
  @Get('profiles/me')
  async getMyProfile(@Req() req: Request, @Query('userId') userId?: string) {
    const targetUserId = req.user?.firebaseId || userId;
    return firstValueFrom(
      this.client.send({ cmd: 'get_profile' }, { userId: targetUserId }),
    );
  }

  @Public()
  @Patch('profiles/me')
  async updateMyProfile(
    @Req() req: Request,
    @Body() data: Record<string, unknown>,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = req.user?.firebaseId || (data?.userId as string) || userId;
    return firstValueFrom(
      this.client.send({ cmd: 'update_profile' }, { userId: targetUserId, ...data }),
    );
  }

  // --- Availability ---
  @Public()
  @Get('availability/rules')
  async getAvailabilityRules() {
    return firstValueFrom(
      this.client.send({ cmd: 'get_availability_rules' }, {}),
    );
  }

  @Post('availability/rules')
  @Roles('ADMIN')
  async createAvailabilityRule(@Body() data: Record<string, unknown>) {
    return firstValueFrom(
      this.client.send({ cmd: 'create_availability_rule' }, data),
    );
  }

  @Patch('availability/rules/:id')
  @Roles('ADMIN')
  async updateAvailabilityRule(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return firstValueFrom(
      this.client.send({ cmd: 'update_availability_rule' }, { id, ...data }),
    );
  }

  @Delete('availability/rules/:id')
  @Roles('ADMIN')
  async removeAvailabilityRule(@Param('id') id: string) {
    return firstValueFrom(
      this.client.send({ cmd: 'remove_availability_rule' }, { id }),
    );
  }

  // --- Bookings ---
  @Get('bookings')
  @Roles('ADMIN')
  async getAllBookings() {
    return firstValueFrom(
      this.client.send({ cmd: 'get_all_bookings' }, {}),
    );
  }

  @Public()
  @Post('bookings')
  async createBooking(@Req() req: Request, @Body() data: Record<string, unknown>) {
    return firstValueFrom(
      this.client.send({ cmd: 'create_booking' }, { userId: req.user?.firebaseId, ...data }),
    );
  }

  @Public()
  @Get('bookings/me')
  async getMyBookings(@Req() req: Request, @Query('userId') userId?: string) {
    const targetUserId = req.user?.firebaseId || userId;
    return firstValueFrom(
      this.client.send({ cmd: 'get_user_bookings' }, { userId: targetUserId }),
    );
  }

  @Patch('bookings/:id')
  @Roles('ADMIN')
  async updateBooking(
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return firstValueFrom(
      this.client.send({ cmd: 'update_booking' }, { id, ...data }),
    );
  }

  // --- Applications ---
  @Get('applications')
  @Roles('ADMIN')
  async getAllApplications() {
    return firstValueFrom(
      this.client.send({ cmd: 'get_all_applications' }, {}),
    );
  }
  @Public()
  @Post('applications')
  async createApplication(@Req() req: Request, @Body() data: Record<string, unknown>) {
    return firstValueFrom(
      this.client.send({ cmd: 'create_application' }, { userId: req.user?.firebaseId, ...data }),
    );
  }

  @Public()
  @Get('applications/me')
  async getMyApplications(@Req() req: Request, @Query('userId') userId?: string) {
    const targetUserId = req.user?.firebaseId || userId;
    return firstValueFrom(
      this.client.send({ cmd: 'get_user_applications' }, { userId: targetUserId }),
    );
  }

  @Public()
  @Get('applications/:id')
  async getApplication(@Param('id') id: string, @Req() req: Request) {
    return firstValueFrom(
      this.client.send({ cmd: 'get_application' }, { id, user: req.user }),
    );
  }

  @Patch('applications/:id')
  @Roles('ADMIN')
  async updateApplication(
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return firstValueFrom(
      this.client.send({ cmd: 'update_application' }, { id, ...data }),
    );
  }

  @Patch('applications/:id/status')
  @Roles('ADMIN')
  async updateApplicationStatus(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() data: Record<string, unknown>,
  ) {
    return firstValueFrom(
      this.client.send({ cmd: 'update_application_status' }, {
        id,
        changedBy: req.user!.firebaseId,
        ...data,
      }),
    );
  }

  @Public()
  @Post('applications/documents')
  async addApplicationDocument(@Body() data: Record<string, unknown>) {
    return firstValueFrom(
      this.client.send({ cmd: 'add_application_document' }, data),
    );
  }
  @Public()
  @Get('cms/pages')
  async getPages() {
    return firstValueFrom(this.client.send({ cmd: 'get_pages' }, {}));
  }

  @Public()
  @Get('cms/pages/:slug')
  async getPageBySlug(@Param('slug') slug: string) {
    return firstValueFrom(this.client.send({ cmd: 'get_page_by_slug' }, { slug }));
  }

  @Public()
  @Get('cms/resources')
  async getResources(@Query('type') type: string) {
    return firstValueFrom(this.client.send({ cmd: 'get_resources' }, { type }));
  }

  @Public()
  @Get('cms/webinars')
  async getWebinars() {
    return firstValueFrom(this.client.send({ cmd: 'get_webinars' }, {}));
  }

  @Public()
  @Get('cms/testimonials')
  async getTestimonials() {
    return firstValueFrom(this.client.send({ cmd: 'get_testimonials' }, {}));
  }

  @Public()
  @Post('cms/webinars/:id/register')
  async registerForWebinar(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return firstValueFrom(this.client.send({ cmd: 'register_webinar' }, { id, ...data }));
  }

  @Public()
  @Get('cms/webinars/:id/registrations')
  async getWebinarRegistrations(@Param('id') id: string) {
    return firstValueFrom(
      this.client.send({ cmd: 'get_webinar_registrations' }, { webinarId: id }),
    );
  }

  @Public()
  @Get('cms/webinars-registrations')
  async getAllWebinarRegistrations(@Query('webinarId') webinarId?: string) {
    return firstValueFrom(
      this.client.send({ cmd: 'get_webinar_registrations' }, { webinarId }),
    );
  }

  // --- Admin CMS ---
  @Post('cms/pages')
  @Roles('ADMIN')
  async createPage(@Body() data: Record<string, unknown>) {
    return firstValueFrom(this.client.send({ cmd: 'create_page' }, data));
  }

  @Patch('cms/pages/:id')
  @Roles('ADMIN')
  async updatePage(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return firstValueFrom(this.client.send({ cmd: 'update_page' }, { id, ...data }));
  }

  @Delete('cms/pages/:id')
  @Roles('ADMIN')
  async removePage(@Param('id') id: string) {
    return firstValueFrom(this.client.send({ cmd: 'remove_page' }, { id }));
  }

  @Post('cms/resources')
  @Roles('ADMIN')
  async createResource(@Body() data: Record<string, unknown>) {
    return firstValueFrom(this.client.send({ cmd: 'create_resource' }, data));
  }

  @Patch('cms/resources/:id')
  @Roles('ADMIN')
  async updateResource(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return firstValueFrom(this.client.send({ cmd: 'update_resource' }, { id, ...data }));
  }

  @Delete('cms/resources/:id')
  @Roles('ADMIN')
  async removeResource(@Param('id') id: string) {
    return firstValueFrom(this.client.send({ cmd: 'remove_resource' }, { id }));
  }

  @Public()
  @Post('cms/webinars')
  async createWebinar(@Body() data: Record<string, unknown>) {
    return firstValueFrom(this.client.send({ cmd: 'create_webinar' }, data));
  }

  @Public()
  @Patch('cms/webinars/:id')
  async updateWebinar(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return firstValueFrom(this.client.send({ cmd: 'update_webinar' }, { id, ...data }));
  }

  @Public()
  @Delete('cms/webinars/:id')
  async removeWebinar(@Param('id') id: string) {
    return firstValueFrom(this.client.send({ cmd: 'remove_webinar' }, { id }));
  }

  @Post('cms/testimonials')
  @Roles('ADMIN')
  async createTestimonial(@Body() data: Record<string, unknown>) {
    return firstValueFrom(this.client.send({ cmd: 'create_testimonial' }, data));
  }

  @Patch('cms/testimonials/:id')
  @Roles('ADMIN')
  async updateTestimonial(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return firstValueFrom(this.client.send({ cmd: 'update_testimonial' }, { id, ...data }));
  }

  @Delete('cms/testimonials/:id')
  @Roles('ADMIN')
  async removeTestimonial(@Param('id') id: string) {
    return firstValueFrom(this.client.send({ cmd: 'remove_testimonial' }, { id }));
  }

  @Public()
  @Get('applications/status/:code')
  async getApplicationByCode(@Param('code') code: string) {
    return firstValueFrom(
      this.client.send({ cmd: 'get_application_by_code' }, { code }),
    );
  }
  // --- Contact ---
  @Public()
  @Post('contact')
  async createContactSubmission(@Req() req: Request, @Body() data: Record<string, unknown>) {
    return firstValueFrom(
      this.client.send({ cmd: 'create_contact_submission' }, {
        userId: req.user?.firebaseId,
        ...data,
      }),
    );
  }

  @Patch('contacts/:id')
  @Roles('ADMIN')
  async updateContact(
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return firstValueFrom(
      this.client.send({ cmd: 'update_contact' }, { id, ...data }),
    );
  }

  @Delete('contacts/:id')
  @Roles('ADMIN')
  async removeContact(@Param('id') id: string) {
    return firstValueFrom(
      this.client.send({ cmd: 'remove_contact' }, { id }),
    );
  }

  @Get('contacts')
  @Roles('ADMIN')
  async getAllContacts() {
    return firstValueFrom(
      this.client.send({ cmd: 'get_all_contacts' }, {}),
    );
  }

  // --- File Uploads for Consultancy ---
  @Public()
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadConsultancyImage(@UploadedFile() file: Express.Multer.File) {
    return this.fileUploadService.uploadFile(file, 'image');
  }

  @Public()
  @Post('upload/document')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadConsultancyDocument(@UploadedFile() file: Express.Multer.File) {
    return this.fileUploadService.uploadFile(file, 'document');
  }

  @Public()
  @Post('upload/:type')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadConsultancyType(
    @UploadedFile() file: Express.Multer.File,
    @Param('type') type: string,
  ) {
    const resolvedType = type === 'document' ? 'document' : (type === 'video' ? 'video' : 'image');
    return this.fileUploadService.uploadFile(file, resolvedType as any);
  }

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadConsultancyDefault(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type?: string,
  ) {
    const resolvedType = type === 'document' ? 'document' : (type === 'video' ? 'video' : 'image');
    return this.fileUploadService.uploadFile(file, resolvedType as any);
  }
}
