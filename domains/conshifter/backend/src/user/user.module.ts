import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { createAuthClientAsync } from '@alikohub/auth-client';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    ClientsModule.registerAsync([createAuthClientAsync()]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
