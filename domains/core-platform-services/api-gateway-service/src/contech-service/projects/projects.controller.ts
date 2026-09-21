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
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../../file-upload-service/file-upload.service';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(
    @Inject('CONTECH_SERVICE') private contechClient: ClientProxy,
    private readonly fileUploadService: FileUploadService
  ) {}

  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @Post()
  createProject(@Request() req: RequestWithUser, @Body() createProjectDto: CreateProjectDto) {
    const payload = {
      dto: createProjectDto,
      user: req.user,
    };
    return this.contechClient.send({ cmd: 'create_project' }, payload);
  }

  @ApiOperation({ summary: 'Get all projects' })
  @ApiQuery({ name: 'query', required: false, type: Object })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  @Get()
  findAllProjects(@Request() req: RequestWithUser, @Query() query: any) {
    const payload = { query, user: req.user };
    return this.contechClient.send({ cmd: 'find_all_projects' }, payload);
  }

  @ApiOperation({ summary: 'Get project statistics' })
  @ApiQuery({ name: 'managerId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Project stats retrieved successfully',
  })
  @Get('stats')
  getProjectStats(@Request() req: RequestWithUser, @Query('managerId') managerId?: string) {
    const payload = { manager: managerId, user: req.user };
    return this.contechClient.send({ cmd: 'get_project_stats' }, payload);
  }

  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @Get(':id')
  findProjectById(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    const payload = { id, user: req.user };
    return this.contechClient.send({ cmd: 'find_project_by_id' }, payload);
  }

  @ApiOperation({ summary: 'Update project details' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @Patch(':id')
  updateProject(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    const payload = { id, dto: updateProjectDto, user: req.user };
    return this.contechClient.send({ cmd: 'update_project' }, payload);
  }

  @ApiOperation({ summary: 'Delete a project by ID' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @Delete(':id')
  removeProject(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    const payload = { id, user: req.user };
    return this.contechClient.send({ cmd: 'remove_project' }, payload);
  }

  @ApiOperation({ summary: 'Update project status' })
  @ApiBody({ schema: { example: { status: 'ACTIVE' } } })
  @ApiResponse({
    status: 200,
    description: 'Project status updated successfully',
  })
  @Patch(':id/status')
  updateProjectStatus(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: any,
  ) {
    const payload = { id, status, user: req.user };
    return this.contechClient.send({ cmd: 'update_project_status' }, payload);
  }

  @ApiOperation({ summary: 'Update project photos' })
  @ApiBody({ schema: { example: { photos: ['https://link-to-photo.jpg'] } } })
  @ApiResponse({
    status: 200,
    description: 'Project photos updated successfully',
  })
  @Patch(':id/photos')
  updateProjectPhotos(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('photos') photos: string[],
  ) {
    const payload = { id, photos, user: req.user };
    return this.contechClient.send({ cmd: 'update_project_photos' }, payload);
  }

  @ApiOperation({ summary: 'Get all contractors' })
  @ApiResponse({
    status: 200,
    description: 'Contractors retrieved successfully',
  })
  @Get('contractor')
  findAllContractors(@Request() req: RequestWithUser) {
    const payload = { user: req.user };
    return this.contechClient.send({ cmd: 'find_contractor' }, payload);
  }

  @ApiOperation({ summary: 'Update project progress' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        progress: { type: 'number', minimum: 0, maximum: 100, example: 45 },
        notes: { type: 'string', example: 'Completed foundation work' },
      },
      required: ['progress'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Project progress updated successfully',
  })
  @Post(':id/progress')
  updateProjectProgress(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('progress') progress: number,
    @Body('notes') notes?: string,
  ) {
    const payload = { id, progress, notes, user: req.user };
    return this.contechClient.send({ cmd: 'update_project_progress' }, payload);
  }

  // TEST-04: Create project update (weekly summaries)
  @ApiOperation({ summary: 'Create a project update/summary' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', example: 'Weekly summary: Completed phase 1...' },
        isVisibleToClient: { type: 'boolean', example: false },
      },
      required: ['text'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Project update created successfully',
  })
  @Post(':id/updates')
  createProjectUpdate(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('text') text: string,
    @Body('isVisibleToClient') isVisibleToClient?: boolean,
  ) {
    const payload = { projectId: id, text, isVisibleToClient, user: req.user };
    return this.contechClient.send({ cmd: 'create_project_update' }, payload);
  }

  // TEST-04: Get project updates (weekly summaries)
  @ApiOperation({ summary: 'Get project updates/summaries' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Project updates retrieved successfully',
  })
  @Get(':id/updates')
  getProjectUpdates(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const payload = { projectId: id, page, pageSize, user: req.user };
    return this.contechClient.send({ cmd: 'get_project_updates' }, payload);
  }

  // Document Management
  @ApiOperation({ summary: 'Add a document to project' })
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'Site Plan v1' },
        fileType: { type: 'string', example: 'PDF' },
        isVisibleToClient: { type: 'boolean', example: false },
      },
      required: ['title'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document added successfully',
  })
  async addDocument(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { title: string; url?: string; fileType?: string; isVisibleToClient?: boolean },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      const uploadResult = await this.fileUploadService.uploadFile(file, 'document');
      dto.url = uploadResult.url;
    }
    const payload = { projectId: id, dto, user: req.user };
    return this.contechClient.send({ cmd: 'add_project_document' }, payload);
  }

  @ApiOperation({ summary: 'Get project documents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
  })
  @Get(':id/documents')
  getDocuments(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const payload = { projectId: id, page, pageSize, user: req.user };
    return this.contechClient.send({ cmd: 'get_project_documents' }, payload);
  }

  @ApiOperation({ summary: 'Create a project comment' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', example: 'This is a comment' },
      },
      required: ['text'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
  })
  @Post(':id/comments')
  createComment(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
  ) {
    const payload = { projectId: id, content, user: req.user };
    return this.contechClient.send({ cmd: 'add_project_comment' }, payload);
  }

  @ApiOperation({ summary: 'Get project comments' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
  })
  @Get(':id/comments')
  findAllComments(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    const payload = { id, user: req.user };
    return this.contechClient.send({ cmd: 'get_project_comments' }, payload);
  }
}
