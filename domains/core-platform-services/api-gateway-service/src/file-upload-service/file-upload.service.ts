import { Injectable, BadRequestException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getFileUploadHttpBaseUrl, uploadFileHttp } from '@alikohub/file-upload-client';

@Injectable()
export class FileUploadService {
  constructor(private readonly configService: ConfigService) {}

  async uploadFile(
    file: Express.Multer.File,
    type: 'image' | 'document' | 'video',
  ): Promise<any> {
    if (!file) throw new BadRequestException('File is required');

    try {
      // Ensure base URL config is resolved (side-effect for logging/debug)
      getFileUploadHttpBaseUrl(this.configService);
      return await uploadFileHttp(
        {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype || 'application/octet-stream',
        },
        this.configService,
      );
    } catch (error: any) {
      console.error(`File Upload Error (${type}):`, error.message);
      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      throw new BadRequestException(`File upload failed for ${type}`);
    }
  }
}
