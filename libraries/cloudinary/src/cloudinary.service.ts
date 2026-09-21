import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
  UploadApiOptions,
} from 'cloudinary';
import { Readable } from 'stream';

/** Minimal file shape accepted by upload helpers (TCP payloads often omit multer fields). */
export type MulterFile = {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
  size?: number;
  fieldname?: string;
  encoding?: string;
  destination?: string;
  filename?: string;
  path?: string;
};

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: MulterFile,
    options?: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    const uploadOptions: UploadApiOptions = {
      ...options,
      resource_type: 'image',
    };
    return this.uploadStream(file.buffer, uploadOptions);
  }

  async uploadRaw(
    file: MulterFile,
    options?: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    const uploadOptions: UploadApiOptions = {
      ...options,
      resource_type: 'raw',
    };
    return this.uploadStream(file.buffer, uploadOptions);
  }

  private uploadStream(
    buffer: Buffer,
    options: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        options,
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error);
            return reject(new InternalServerErrorException(error.message));
          }
          if (result) {
            resolve(result);
          } else {
            reject(
              new InternalServerErrorException(
                'No result returned from Cloudinary upload.',
              ),
            );
          }
        },
      );
      const readableStream = new Readable();
      const safeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
      readableStream.push(safeBuffer);
      readableStream.push(null);
      readableStream.pipe(upload);
    });
  }
}
