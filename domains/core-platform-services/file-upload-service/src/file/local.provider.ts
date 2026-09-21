import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageProvider, FileResponse } from './storage.interface';
import * as fs from 'fs';
import * as path from 'path';
import { Express } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LocalDiskProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalDiskProvider.name);
  private readonly uploadDir: string;
  private readonly hostUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_PATH') || path.join(process.cwd(), 'uploads');
    this.hostUrl = this.configService.get('HOST_URL') || `http://localhost:${this.configService.get('PORT') || 3009}`;
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      try {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        this.logger.log(`Created upload directory at: ${this.uploadDir}`);
      } catch (error) {
        this.logger.error(`Failed to create upload directory at: ${this.uploadDir}`, error);
      }
    } else {
      this.logger.log(`Using upload directory at: ${this.uploadDir}`);
    }
  }

  async upload(file: Express.Multer.File, folder: string = 'misc'): Promise<FileResponse> {
    try {
      // Use the full folder path, creating any parent directories as needed
      const targetDir = path.join(this.uploadDir, folder);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filename = `${randomUUID()}${path.extname(file.originalname)}`;
      const filePath = path.join(targetDir, filename);

      await fs.promises.writeFile(filePath, file.buffer);

      const url = `${this.hostUrl}/uploads/${folder}/${filename}`;
      const publicId = `${folder}/${filename}`; 

      return {
        url,
        publicId,
        format: path.extname(file.originalname).replace('.', ''),
        size: file.size,
      };
    } catch (error) {
      this.logger.error('Local file write failed', error);
      throw new BadRequestException('File upload failed');
    }
  }

  async delete(publicId: string): Promise<boolean> {
    try {
      // Prevent directory traversal
      const safePublicId = path.normalize(publicId).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = path.join(this.uploadDir, safePublicId);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Local file delete failed', error);
      return false;
    }
  }
}
