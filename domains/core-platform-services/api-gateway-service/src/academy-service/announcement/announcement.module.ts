import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AnnouncementController } from './announcement.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ACADEMY_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.ACADEMY_SERVICE_HOST || '127.0.0.1',
          port: Number(process.env.ACADEMY_SERVICE_PORT) || 3005,
        },
      },
    ]),
  ],
  controllers: [AnnouncementController],
})
export class AnnouncementModule {}
