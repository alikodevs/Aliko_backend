import { Controller, Get, Param, Res, Req, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';

@Controller('uploads')
export class FileProxyController {
  private readonly fileServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get('FILE_UPLOAD_SERVICE_HOST') || 'localhost';
    const port = this.configService.get('FILE_UPLOAD_SERVICE_PORT') || '3009';
    this.fileServiceUrl = `http://${host}:${port}`;
  }

  @Public()
  @Get('*')
  async proxyFile(@Res() res: Response, @Req() req: any) {
    // req.params[0] captures the wildcard '*' part of the route
    const path = req.params['0']; 
    
    if (!path) {
      throw new HttpException('Path is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.fileServiceUrl}/uploads/${path}`, {
          responseType: 'stream',
        }),
      );

      // Forward content-type header
      const contentType = response.headers['content-type'];
      if (contentType) {
        res.setHeader('Content-Type', String(contentType));
      }

      // Forward content-length if available
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        res.setHeader('Content-Length', String(contentLength));
      }

      // No caching for PDFs (always serve fresh), cache images for 1 day
      if (path.endsWith('.pdf')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }

      response.data.pipe(res);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Failed to retrieve file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
