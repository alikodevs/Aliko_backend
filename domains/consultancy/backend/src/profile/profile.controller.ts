import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { Prisma } from '../generated/client';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @MessagePattern({ cmd: 'get_profile' })
  handleGetProfile(@Payload() payload: any) {
    const userId = typeof payload === 'string' ? payload : (payload?.userId || payload?.id);
    return this.profileService.findByUserId(userId);
  }

  @MessagePattern({ cmd: 'update_profile' })
  handleUpdateProfile(@Payload() payload: any) {
    const userId = payload?.userId || payload?.id;
    const { userId: ignoredUser, id: ignoredId, ...data } = payload || {};
    return this.profileService.updateByUserId(userId, data);
  }

  // --- HTTP Direct (internal) ---
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profileService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Prisma.ProfileUpdateInput) {
    return this.profileService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.profileService.remove(id);
  }

  @Post('roles')
  createRole(@Body() data: Prisma.UserRoleCreateInput) {
    return this.profileService.createRole(data);
  }

  @Get(':userId/roles')
  findRoles(@Param('userId') userId: string) {
    return this.profileService.findRoles(userId);
  }

  @Delete('roles/:id')
  removeRole(@Param('id') id: string) {
    return this.profileService.removeRole(id);
  }
}
