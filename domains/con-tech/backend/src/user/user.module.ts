import { Global, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { createAuthClientAsync } from '@alikohub/auth-client';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClientsModule.registerAsync([createAuthClientAsync()]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
