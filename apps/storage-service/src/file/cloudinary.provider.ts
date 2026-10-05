import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { IStorageProvider, FileResponse } from './storage.interface';
import { Express } from 'express';

@Injectable()
export class CloudinaryProvider implements IStorageProvider {
  private readonly logger = new Logger(CloudinaryProvider.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async upload(file: Express.Multer.File, folder: string = 'alikohub'): Promise<FileResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload failed', error);
            return reject(error);
          }
          if (!result) {
              return reject(new Error('Cloudinary upload returned ' + result));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async delete(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      this.logger.error('Cloudinary delete failed', error);
      return false;
    }
  }
}
