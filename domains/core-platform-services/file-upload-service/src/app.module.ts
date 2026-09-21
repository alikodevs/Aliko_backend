import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join, resolve } from 'path';
import { FileModule } from './file/file.module';
import { AppController } from './app.controller';

const uploadPath = resolve(process.env.UPLOAD_PATH || join(process.cwd(), 'uploads'));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: uploadPath,
      serveRoot: '/uploads',
      serveStaticOptions: {
        maxAge: 0,
        cacheControl: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.jfif')) {
            res.setHeader('Content-Type', 'image/jpeg');
          }
          if (filePath.endsWith('.pdf')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
          }
        },
      },
    }),
    FileModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
