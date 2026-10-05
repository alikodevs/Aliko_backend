import { Controller, Post, Delete, UseInterceptors, UploadedFile, Body, Param, Query, UsePipes, BadRequestException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { Express } from 'express';
import * as Joi from 'joi';
import { JoiValidationPipe } from './joi-validation.pipe';

const uploadSchema = Joi.object({
  type: Joi.string().valid('image', 'document', 'video').default('image'),
});

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new JoiValidationPipe(uploadSchema))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File, 
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided in form-data (field "file" required)');
    }
    const type = body.type || 'image';
    return this.fileService.uploadFile(file, type);
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

