import { Controller, Post, Delete, UseInterceptors, UploadedFile, UploadedFiles, Body, Param, Query, Req, UsePipes, BadRequestException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { Express } from 'express';
import * as Joi from 'joi';
import { JoiValidationPipe } from './joi-validation.pipe';

const uploadSchema = Joi.object({
  type: Joi.string().valid('image', 'document', 'video').default('image'),
}).unknown(true);

@Controller(['files', 'upload', 'uploads'])
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post(['', 'upload', 'document', 'image', 'video', 'document/upload', 'file/upload'])
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFile(
    @UploadedFiles() files: Express.Multer.File[],
    @UploadedFile() singleFile: Express.Multer.File,
    @Body() body: any,
    @Req() req: any,
  ) {
    const file = (files && files.length > 0) ? files[0] : (singleFile || req?.file);
    if (!file) {
      throw new BadRequestException('No file provided in form-data (field "file" or "document" required)');
    }
    const url = req?.url || '';
    const type = body?.type || (url.includes('document') ? 'document' : url.includes('video') ? 'video' : 'image');
    const result = await this.fileService.uploadFile(file, type);
    return {
      success: true,
      url: result.url,
      secure_url: result.url,
      fileUrl: result.url,
      path: result.url,
      publicId: result.publicId,
      format: result.format,
      size: result.size,
      data: { url: result.url, fileUrl: result.url },
    };
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    return this.fileService.deleteFile(id);
  }

  @MessagePattern({ cmd: 'upload_file' })
  async handleUpload(@Payload() data: { file: any; folder: string }) {
    // Reconstruct file object compatible with Express.Multer.File
    const file: any = {
      buffer: typeof data.file.buffer === 'object' && data.file.buffer.type === 'Buffer'
        ? Buffer.from(data.file.buffer.data) 
        : Buffer.from(data.file.buffer),
      originalname: data.file.originalname,
      mimetype: data.file.mimetype,
      size: data.file.size,
    };
    
    // Extract type from folder or mimetype to satisfy service logic
    let type = 'document';
    if (file.mimetype.startsWith('image/')) type = 'image';
    if (file.mimetype.startsWith('video/')) type = 'video';
    
    return this.fileService.uploadFile(file, type);
  }
}

