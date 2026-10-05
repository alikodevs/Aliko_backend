import { Express } from 'express';

export interface FileResponse {
  url: string;
  publicId: string;
  format: string;
  size: number;
}

export interface IStorageProvider {
  upload(file: Express.Multer.File, folder?: string): Promise<FileResponse>;
  delete(publicId: string): Promise<boolean>;
}
