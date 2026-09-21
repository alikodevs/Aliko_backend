import { ConfigModule, ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import axios from 'axios';
import FormData from 'form-data';

export const FILE_UPLOAD_SERVICE = 'FILE_UPLOAD_SERVICE';

export const FILE_UPLOAD_MESSAGE_PATTERNS = {
  UPLOAD_FILE: 'upload_file',
} as const;

/** Nest ClientsModule.registerAsync entry (loosely typed for Nest 10/11 compatibility). */
export function createFileUploadClientAsync(
  name: string = FILE_UPLOAD_SERVICE,
): any {
  return {
    name,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.TCP,
      options: {
        host:
          configService.get('FILE_UPLOAD_SERVICE_HOST') || 'file-upload-service',
        port: Number(configService.get('FILE_UPLOAD_TCP_PORT')) || 3019,
      },
    }),
  };
}

type ConfigLike = {
  get?: (key: string) => string | undefined;
};

export function getFileUploadHttpBaseUrl(config?: ConfigLike): string {
  const host =
    config?.get?.('FILE_UPLOAD_SERVICE_HOST') ||
    process.env.FILE_UPLOAD_SERVICE_HOST ||
    'localhost';
  const port =
    config?.get?.('FILE_UPLOAD_SERVICE_PORT') ||
    process.env.FILE_UPLOAD_SERVICE_PORT ||
    '3010';
  return `http://${host}:${port}`;
}

export async function uploadFileHttp(
  file: { buffer: Buffer; originalname: string; mimetype: string },
  config?: ConfigLike,
): Promise<unknown> {
  const form = new FormData();
  form.append('file', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });
  const baseUrl = getFileUploadHttpBaseUrl(config);
  const response = await axios.post(`${baseUrl}/files/upload`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
  });
  return response.data;
}
