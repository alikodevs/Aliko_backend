import { Global, Injectable, Module } from '@nestjs/common';

export * from './multer.config';
export * from './storage.service';
export * from './storage.module';

@Injectable()
export class CloudinaryService {
  async uploadFile(file: any, folder?: string): Promise<any> {
    return { url: `/uploads/${file?.originalname || 'file'}`, secure_url: `/uploads/${file?.originalname || 'file'}`, public_id: 'local' };
  }

  async uploadRaw(file: any, options?: any): Promise<any> {
    return { url: `/uploads/${file?.originalname || 'raw'}`, secure_url: `/uploads/${file?.originalname || 'raw'}`, public_id: 'local' };
  }

  async uploadImage(file: any, options?: any): Promise<any> {
    return { url: `/uploads/${file?.originalname || 'image'}`, secure_url: `/uploads/${file?.originalname || 'image'}`, public_id: 'local' };
  }
}

@Global()
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}

export type MulterFile = any;
