import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.registerAsync([
      {
        name: 'ACADEMY_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('ACADEMY_SERVICE_HOST') || 'localhost',
            port: configService.get('ACADEMY_SERVICE_PORT') || 3005,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'CONTECH_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('CONTECH_SERVICE_HOST') || 'localhost',
            port: configService.get('CONTECH_SERVICE_PORT') || 3002,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'EVENTS_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('EVENTS_SERVICE_HOST') || 'localhost',
            port: parseInt(configService.get('EVENTS_SERVICE_PORT')) || 3004,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'ALIKOWASH_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('ALIKOWASH_SERVICE_HOST') || 'localhost',
            port: parseInt(configService.get('ALIKOWASH_SERVICE_PORT')) || 3013,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'CONSHIFTER_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('CONSHIFTER_SERVICE_HOST') || 'localhost',
            port: parseInt(configService.get('CONSHIFTER_SERVICE_PORT')) || 3014,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
