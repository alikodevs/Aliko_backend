import { Injectable, BadRequestException } from '@nestjs/common';
import { LocalDiskProvider } from './local.provider';
import { FileResponse } from './storage.interface';
import { Express } from 'express';

@Injectable()
export class FileService {
  constructor(private readonly storageProvider: LocalDiskProvider) {}

  async uploadFile(file: Express.Multer.File, type: string): Promise<FileResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate based on type
    this.validateFile(file, type);

    // Determine folder based on type
    const folder = this.getFolderByType(type);

    return this.storageProvider.upload(file, folder);
  }

  async deleteFile(publicId: string): Promise<{ success: boolean }> {
    const deleted = await this.storageProvider.delete(publicId);
    return { success: deleted };
  }

  private validateFile(file: Express.Multer.File, type: string) {
    // Permanent fix: Allow all file formats. 
    // We only keep the size check to prevent server abuse.
    
    const limits: Record<string, number> = {
      image: 10 * 1024 * 1024, // 10MB
      document: 50 * 1024 * 1024, // 50MB
      video: 100 * 1024 * 1024, // 100MB
    };

    const maxLimit = limits[type] || 50 * 1024 * 1024;
    
    if (file.size > maxLimit) {
      throw new BadRequestException(`File too large for ${type}. Max allowed: ${maxLimit / (1024 * 1024)}MB`);
    }
  }

  private getFolderByType(type: string): string {
    const folders: Record<string, string> = {
      image: 'alikohub/images',
      document: 'alikohub/documents',
      video: 'alikohub/videos',
    };
    return folders[type] || 'alikohub/misc';
  }
}
