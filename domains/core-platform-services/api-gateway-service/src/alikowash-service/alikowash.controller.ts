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
  Logger,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '../common/guard/firebase_auth.guard';
import { RequestWithUser } from '../common/types/request-with-user.interface';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../file-upload-service/file-upload.service';

@ApiTags('Alikowash')
@Controller('alikowash')
export class AlikowashController {
  private readonly logger = new Logger(AlikowashController.name);

  constructor(
    @Inject('ALIKOWASH_SERVICE') private alikowashClient: ClientProxy,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @ApiOperation({ summary: 'Get alikowash stats' })
  @Get('stats')
  findAllStats() {
    return this.alikowashClient.send({ cmd: 'alikowash_get_stats' }, {});
  }

  // --- Projects ---
  @ApiOperation({ summary: 'Get all projects' })
  @Get('projects')
  findAllProjects(@Query() query: any) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_all_projects' }, query);
  }

  @ApiOperation({ summary: 'Get project by ID' })
  @Get('projects/:id')
  findProjectById(@Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_project_by_id' }, { id });
  }

  @ApiOperation({ summary: 'Create a new project' })
  @UseGuards(AuthGuard)
  @Post('projects')
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  async createProject(
    @Request() req: RequestWithUser,
    @Body() dto: any,
    @UploadedFiles() photos?: Express.Multer.File[],
  ) {
    if (photos && photos.length > 0) {
      const uploadPromises = photos.map(f => this.fileUploadService.uploadFile(f, 'image'));
      const results = await Promise.all(uploadPromises);
      dto.photos = results.map(r => r.url);
    }
    if (dto.capacityM3 !== undefined) dto.capacityM3 = parseFloat(dto.capacityM3);
    if (dto.displayOrder !== undefined) dto.displayOrder = parseInt(dto.displayOrder, 10);
    if (dto.isPublished !== undefined) dto.isPublished = dto.isPublished === 'true' || dto.isPublished === true;
    if (dto.tags && typeof dto.tags === 'string') {
      try { dto.tags = JSON.parse(dto.tags); } catch (e) { dto.tags = dto.tags.split(',').map((t: string) => t.trim()); }
    }
    if (dto.partnerNames && typeof dto.partnerNames === 'string') {
      try { dto.partnerNames = JSON.parse(dto.partnerNames); } catch (e) { dto.partnerNames = dto.partnerNames.split(',').map((t: string) => t.trim()); }
    }

    return this.alikowashClient.send({ cmd: 'alikowash_create_project' }, { ...dto, user: req.user });
  }

  @ApiOperation({ summary: 'Update project' })
  @UseGuards(AuthGuard)
  @Patch('projects/:id')
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  async updateProject(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFiles() photos?: Express.Multer.File[],
  ) {
    if (photos && photos.length > 0) {
      const uploadPromises = photos.map(f => this.fileUploadService.uploadFile(f, 'image'));
      const results = await Promise.all(uploadPromises);
      dto.photos = results.map(r => r.url);
    }
    if (dto.capacityM3 !== undefined) dto.capacityM3 = parseFloat(dto.capacityM3);
    if (dto.displayOrder !== undefined) dto.displayOrder = parseInt(dto.displayOrder, 10);
    if (dto.isPublished !== undefined) dto.isPublished = dto.isPublished === 'true' || dto.isPublished === true;
    if (dto.tags && typeof dto.tags === 'string') {
      try { dto.tags = JSON.parse(dto.tags); } catch (e) { dto.tags = dto.tags.split(',').map((t: string) => t.trim()); }
    }
    if (dto.partnerNames && typeof dto.partnerNames === 'string') {
      try { dto.partnerNames = JSON.parse(dto.partnerNames); } catch (e) { dto.partnerNames = dto.partnerNames.split(',').map((t: string) => t.trim()); }
    }

    return this.alikowashClient.send({ cmd: 'alikowash_update_project' }, { id, dto, user: req.user });
  }

  @ApiOperation({ summary: 'Delete a project' })
  @UseGuards(AuthGuard)
  @Delete('projects/:id')
  @ApiBearerAuth()
  removeProject(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_remove_project' }, { id, user: req.user });
  }

  // --- Partners ---
  @ApiOperation({ summary: 'Get all partners' })
  @Get('partners')
  findAllPartners(@Query() query: any) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_all_partners' }, query);
  }

  @ApiOperation({ summary: 'Create a partner' })
  @UseGuards(AuthGuard)
  @Post('partners')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  async createPartner(
    @Request() req: RequestWithUser,
    @Body() dto: any,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    if (logo) {
      const uploadResult = await this.fileUploadService.uploadFile(logo, 'image');
      dto.logoUrl = uploadResult.url;
    }
    if (dto.displayOrder !== undefined) dto.displayOrder = parseInt(dto.displayOrder, 10);
    if (dto.isPublished !== undefined) dto.isPublished = dto.isPublished === 'true' || dto.isPublished === true;

    return this.alikowashClient.send({ cmd: 'alikowash_create_partner' }, { ...dto, user: req.user });
  }

  @ApiOperation({ summary: 'Update a partner' })
  @UseGuards(AuthGuard)
  @Patch('partners/:id')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  async updatePartner(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    if (logo) {
      const uploadResult = await this.fileUploadService.uploadFile(logo, 'image');
      dto.logoUrl = uploadResult.url;
    }
    if (dto.displayOrder !== undefined) dto.displayOrder = parseInt(dto.displayOrder, 10);
    if (dto.isPublished !== undefined) dto.isPublished = dto.isPublished === 'true' || dto.isPublished === true;

    return this.alikowashClient.send({ cmd: 'alikowash_update_partner' }, { id, dto, user: req.user });
  }

  @ApiOperation({ summary: 'Delete a partner' })
  @UseGuards(AuthGuard)
  @Delete('partners/:id')
  @ApiBearerAuth()
  removePartner(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_remove_partner' }, { id, user: req.user });
  }

  @ApiOperation({ summary: 'Get partner by ID' })
  @Get('partners/:id')
  findPartnerById(@Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_partner_by_id' }, { id });
  }

  // --- Contacts ---
  @ApiOperation({ summary: 'Submit contact inquiry' })
  @Post('contacts')
  submitContact(@Body() dto: any) {
    return this.alikowashClient.send({ cmd: 'alikowash_submit_contact' }, dto);
  }

  @ApiOperation({ summary: 'Get all contact inquiries' })
  @UseGuards(AuthGuard)
  @Get('contacts')
  @ApiBearerAuth()
  findAllContacts(@Request() req: RequestWithUser, @Query() query: any) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_all_contacts' }, { ...query, user: req.user });
  }

  @ApiOperation({ summary: 'Get contact by ID' })
  @UseGuards(AuthGuard)
  @Get('contacts/:id')
  @ApiBearerAuth()
  findOneContact(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_contact_by_id' }, { id, user: req.user });
  }

  @ApiOperation({ summary: 'Mark contact as read' })
  @UseGuards(AuthGuard)
  @Patch('contacts/:id/read')
  @ApiBearerAuth()
  markContactRead(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_mark_contact_read' }, { id, user: req.user });
  }

  @ApiOperation({ summary: 'Delete contact' })
  @UseGuards(AuthGuard)
  @Delete('contacts/:id')
  @ApiBearerAuth()
  removeContact(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_remove_contact' }, { id, user: req.user });
  }

  // --- Donations ---
  @ApiOperation({ summary: 'Submit donation request' })
  @Post('donations')
  submitDonation(@Body() dto: any) {
    return this.alikowashClient.send({ cmd: 'alikowash_submit_donation' }, dto);
  }

  @ApiOperation({ summary: 'Get all donation records' })
  @UseGuards(AuthGuard)
  @Get('donations')
  @ApiBearerAuth()
  findAllDonations(@Request() req: RequestWithUser, @Query() query: any) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_all_donations' }, { ...query, user: req.user });
  }

  @ApiOperation({ summary: 'Get donation record by ID' })
  @UseGuards(AuthGuard)
  @Get('donations/:id')
  @ApiBearerAuth()
  findOneDonation(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_donation_by_id' }, { id, user: req.user });
  }

  @ApiOperation({ summary: 'Update donation status' })
  @UseGuards(AuthGuard)
  @Patch('donations/:id/status')
  @ApiBearerAuth()
  updateDonationStatus(@Request() req: RequestWithUser, @Param('id') id: string, @Body('status') status: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_update_donation_status' }, { id, status, user: req.user });
  }

  @ApiOperation({ summary: 'Delete donation record' })
  @UseGuards(AuthGuard)
  @Delete('donations/:id')
  @ApiBearerAuth()
  removeDonation(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_remove_donation' }, { id, user: req.user });
  }

  // --- Stories ---
  @ApiOperation({ summary: 'Get all stories' })
  @Get('stories')
  findAllStories(@Query() query: any) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_all_stories' }, query);
  }

  @ApiOperation({ summary: 'Get story chapter by ID' })
  @Get('stories/:id')
  findStoryById(@Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_story_by_id' }, { id });
  }

  @ApiOperation({ summary: 'Create a story chapter' })
  @UseGuards(AuthGuard)
  @Post('stories')
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  async createStory(
    @Request() req: RequestWithUser,
    @Body() dto: any,
    @UploadedFiles() photos?: Express.Multer.File[],
  ) {
    if (photos && photos.length > 0) {
      const uploadPromises = photos.map(f => this.fileUploadService.uploadFile(f, 'image'));
      const results = await Promise.all(uploadPromises);
      dto.photos = results.map(r => r.url);
    }
    if (dto.year !== undefined) dto.year = parseInt(dto.year, 10);
    if (dto.orderIndex !== undefined) dto.orderIndex = parseInt(dto.orderIndex, 10);
    if (dto.isPublished !== undefined) dto.isPublished = dto.isPublished === 'true' || dto.isPublished === true;
    if (dto.tags && typeof dto.tags === 'string') {
      try { dto.tags = JSON.parse(dto.tags); } catch (e) { dto.tags = dto.tags.split(',').map((t: string) => t.trim()); }
    }
    if (dto.captions && typeof dto.captions === 'string') {
      try { dto.captions = JSON.parse(dto.captions); } catch (e) { dto.captions = dto.captions.split(',').map((t: string) => t.trim()); }
    }

    return this.alikowashClient.send({ cmd: 'alikowash_create_story' }, { ...dto, user: req.user });
  }

  @ApiOperation({ summary: 'Update a story chapter' })
  @UseGuards(AuthGuard)
  @Patch('stories/:id')
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  async updateStory(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFiles() photos?: Express.Multer.File[],
  ) {
    if (photos && photos.length > 0) {
      const uploadPromises = photos.map(f => this.fileUploadService.uploadFile(f, 'image'));
      const results = await Promise.all(uploadPromises);
      dto.photos = results.map(r => r.url);
    }
    if (dto.year !== undefined) dto.year = parseInt(dto.year, 10);
    if (dto.orderIndex !== undefined) dto.orderIndex = parseInt(dto.orderIndex, 10);
    if (dto.isPublished !== undefined) dto.isPublished = dto.isPublished === 'true' || dto.isPublished === true;
    if (dto.tags && typeof dto.tags === 'string') {
      try { dto.tags = JSON.parse(dto.tags); } catch (e) { dto.tags = dto.tags.split(',').map((t: string) => t.trim()); }
    }
    if (dto.captions && typeof dto.captions === 'string') {
      try { dto.captions = JSON.parse(dto.captions); } catch (e) { dto.captions = dto.captions.split(',').map((t: string) => t.trim()); }
    }

    return this.alikowashClient.send({ cmd: 'alikowash_update_story' }, { id, dto, user: req.user });
  }

  @ApiOperation({ summary: 'Delete a story chapter' })
  @UseGuards(AuthGuard)
  @Delete('stories/:id')
  @ApiBearerAuth()
  removeStory(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_remove_story' }, { id, user: req.user });
  }

  // --- Team ---
  @ApiOperation({ summary: 'Get all team members' })
  @Get('team')
  findAllTeamMembers(@Query() query: any) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_all_team_members' }, query);
  }

  @ApiOperation({ summary: 'Get team member by ID' })
  @Get('team/:id')
  findTeamMemberById(@Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_team_member_by_id' }, { id });
  }

  @ApiOperation({ summary: 'Create a team member' })
  @UseGuards(AuthGuard)
  @Post('team')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  async createTeamMember(
    @Request() req: RequestWithUser,
    @Body() dto: any,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    if (photo) {
      const uploadResult = await this.fileUploadService.uploadFile(photo, 'image');
      dto.photoUrl = uploadResult.url;
    }
    if (dto.displayOrder !== undefined) dto.displayOrder = parseInt(dto.displayOrder, 10);
    if (dto.isPublished !== undefined) dto.isPublished = dto.isPublished === 'true' || dto.isPublished === true;

    return this.alikowashClient.send({ cmd: 'alikowash_create_team_member' }, { ...dto, user: req.user });
  }

  @ApiOperation({ summary: 'Update a team member' })
  @UseGuards(AuthGuard)
  @Patch('team/:id')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  async updateTeamMember(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    this.logger.log(`UpdateTeamMember: ID=${id}, Photo=${photo ? photo.originalname : 'none'}`);
    if (photo) {
      const uploadResult = await this.fileUploadService.uploadFile(photo, 'image');
      this.logger.log(`Photo uploaded: ${uploadResult.url}`);
      dto.photoUrl = uploadResult.url;
    }
    if (dto.displayOrder !== undefined) dto.displayOrder = parseInt(dto.displayOrder, 10);
    if (dto.isPublished !== undefined) dto.isPublished = dto.isPublished === 'true' || dto.isPublished === true;

    this.logger.log(`Sending update command with DTO: ${JSON.stringify(dto)}`);
    return this.alikowashClient.send({ cmd: 'alikowash_update_team_member' }, { id, dto, user: req.user });
  }

  @ApiOperation({ summary: 'Delete a team member' })
  @UseGuards(AuthGuard)
  @Delete('team/:id')
  @ApiBearerAuth()
  removeTeamMember(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_remove_team_member' }, { id, user: req.user });
  }

  // --- Settings ---
  @ApiOperation({ summary: 'Upsert site setting' })
  @UseGuards(AuthGuard)
  @Post('settings')
  @ApiBearerAuth()
  upsertSetting(@Request() req: RequestWithUser, @Body() dto: any) {
    return this.alikowashClient.send({ cmd: 'alikowash_upsert_setting' }, { ...dto, user: req.user });
  }

  @ApiOperation({ summary: 'Get all site settings' })
  @Get('settings')
  findAllSettings() {
    return this.alikowashClient.send({ cmd: 'alikowash_find_all_settings' }, {});
  }

  @ApiOperation({ summary: 'Get site setting by key' })
  @Get('settings/:key')
  findSettingByKey(@Param('key') key: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_find_setting_by_key' }, { key });
  }

  @ApiOperation({ summary: 'Delete site setting' })
  @UseGuards(AuthGuard)
  @Delete('settings/:key')
  @ApiBearerAuth()
  removeSetting(@Request() req: RequestWithUser, @Param('key') key: string) {
    return this.alikowashClient.send({ cmd: 'alikowash_remove_setting' }, { key, user: req.user });
  }

  // --- Users/Profiles ---
  @ApiOperation({ summary: 'Get current user profile' })
  @UseGuards(AuthGuard)
  @Get('profile/me')
  @ApiBearerAuth()
  async getMyProfile(@Request() req: RequestWithUser) {
    return this.alikowashClient.send({ cmd: 'get_alikowash_profile' }, { user: req.user });
  }

  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @UseGuards(AuthGuard)
  @Patch('admin/users/:id/role')
  @ApiBearerAuth()
  async updateUserRole(@Request() req: RequestWithUser, @Param('id') id: string, @Body() data: { role: string }) {
    return this.alikowashClient.send({ cmd: 'update_alikowash_user_role' }, { userId: id, role: data.role, user: req.user });
  }

  @ApiOperation({ summary: 'Get all user profiles (Admin only)' })
  @UseGuards(AuthGuard)
  @Get('admin/users')
  @ApiBearerAuth()
  async getAllProfiles(@Request() req: RequestWithUser) {
    return this.alikowashClient.send({ cmd: 'get_all_alikowash_profiles' }, { user: req.user });
  }

  // --- File Upload ---
  @ApiOperation({ summary: 'Upload a file (image/document)' })
  @UseGuards(AuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
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
