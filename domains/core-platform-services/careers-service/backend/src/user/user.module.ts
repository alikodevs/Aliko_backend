import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { createAuthClientAsync } from '@alikohub/auth-client';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.registerAsync([createAuthClientAsync()]),
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
