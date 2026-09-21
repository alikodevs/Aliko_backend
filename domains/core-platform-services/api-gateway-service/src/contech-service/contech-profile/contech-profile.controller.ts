import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import { lastValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SelectRoleDto, ContechRoleDto } from './dto/select-role.dto';

// Define the enum to match the backend
enum ContechRole {
  CLIENT = 'CLIENT',
  CONTRACTOR = 'CONTRACTOR',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@ApiTags('ConTech Profile')
@Controller('profile')
@UseGuards(AuthGuard)
export class ConTechProfileController {
  constructor(@Inject('CONTECH_SERVICE') private contechClient: ClientProxy) {}

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @Get()
  @Get('me')
  getProfile(@Request() req: RequestWithUser) {
    const payload = { user: req.user };
    return this.contechClient.send({ cmd: 'get_contech_profile' }, payload);
  }

  @ApiOperation({ summary: 'Create profile for the current user' })
  @ApiResponse({ status: 201, description: 'Profile created successfully' })
  @Post()
  createProfile(@Request() req: RequestWithUser) {
    const payload = { user: req.user };
    return this.contechClient.send({ cmd: 'create_contech_profile' }, payload);
  }

  @ApiOperation({ summary: 'Update profile for the current user' })
  @ApiBody({ description: 'Update data object', type: Object })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @Put()
  updateProfile(@Request() req: RequestWithUser, @Body() updateData: any) {
    const payload = {
      user: req.user,
      updateData,
    };
    return this.contechClient.send({ cmd: 'update_contech_profile' }, payload);
  }

  @ApiOperation({ summary: 'Select a role for the current user' })
  @ApiBody({ type: SelectRoleDto })
  @ApiResponse({ status: 200, description: 'Role selected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role provided' })
  @Post('select-role')
  async selectRole(@Request() req: RequestWithUser, @Body() selectRoleDto: SelectRoleDto) {
    console.log('selectRole endpoint called with role:', selectRoleDto.role);
    console.log('Full DTO:', selectRoleDto);
    console.log('User:', req.user);

    const payload = {
      user: req.user,
      userId: req.user?.firebaseId,
      role: selectRoleDto.role,
    };

    console.log('Sending payload to contech service:', payload);

    try {
      const result = await lastValueFrom(
        this.contechClient.send({ cmd: 'select_contech_role' }, payload),
      );
      console.log('Received result from contech service:', result);
      return result;
    } catch (error) {
      console.error('Error in selectRole:', error);
      throw new InternalServerErrorException('Failed to select role');
    }
  }
}
