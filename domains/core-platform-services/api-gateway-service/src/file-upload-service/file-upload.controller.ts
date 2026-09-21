import { Controller, Post, Param, UseInterceptors, UploadedFile, Inject, BadRequestException, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../common/guard/firebase_auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { FileUploadService } from './file-upload.service';

@Controller('upload')
@ApiTags('File Upload')
@UseGuards(AuthGuard)
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService
  ) {}

  @Public()
  @Post('image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.fileUploadService.uploadFile(file, 'image');
  }

  @Public()
  @Post('document')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document (PDF, Word)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    return this.fileUploadService.uploadFile(file, 'document');
  }

  @Public()
  @Post('video')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a video' })
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return this.fileUploadService.uploadFile(file, 'video');
  }

  @Public()
  @Post(':type')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadGenericFile(
    @UploadedFile() file: Express.Multer.File,
    @Param('type') type: string,
  ) {
    const resolvedType = type === 'document' ? 'document' : (type === 'video' ? 'video' : 'image');
    return this.fileUploadService.uploadFile(file, resolvedType as any);
  }

  @Public()
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadDefaultFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.fileUploadService.uploadFile(file, 'image');
  }
}
