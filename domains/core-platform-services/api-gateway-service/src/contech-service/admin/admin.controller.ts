import {
  Controller,
  Get,
  Post,
  Inject,
  Query,
  UseGuards,
  Request,
  Param,
  Patch,
  Body,
  Delete,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { AdminAccessGuard } from '../../common/guard/admin-access.guard';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('ConTech Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, AdminAccessGuard)
export class AdminController {
  constructor(
    @Inject('CONTECH_SERVICE') private contechClient: ClientProxy,
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: 'Get Admin Dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved' })
  @Get('dashboard')
  getDashboard(@Request() req: RequestWithUser) {
    const payload = { user: req.user };
    return this.contechClient.send({ cmd: 'get_admin_dashboard' }, payload);
  }

  @ApiOperation({ summary: 'List ConTech users (Clients/Contractors)' })
  @ApiQuery({ name: 'role', enum: ['CLIENT', 'CONTRACTOR'], required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @Get('users')
  listUsers(
    @Request() req: RequestWithUser,
    @Query('role') role: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    const payload = { user: req.user, role, page: pageNum, pageSize: pageSizeNum };
    return this.contechClient.send({ cmd: 'list_contech_users' }, payload);
  }

  @ApiOperation({ summary: 'Create a new ConTech user (Client/Contractor)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @Post('users')
  async createUser(@Request() req: RequestWithUser, @Body() body: any) {
    const payload = { ...body };
    
    // 1. Create user in auth-service
    const authResult = await firstValueFrom(
      this.authClient.send({ cmd: 'create_contech_user' }, payload)
    );

    // 2. Initialize ConTech profile if auth was successful
    if (authResult?.user?.firebaseId) {
      await firstValueFrom(
        this.contechClient.send({ cmd: 'select_contech_role' }, {
          userId: authResult.user.firebaseId,
          role: body.role,
          user: authResult.user,
          hasSelectedRole: true
        })
      );
    }

    return authResult;
  }

  @ApiOperation({ summary: 'Delete a ConTech user account' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @Delete('users/:firebaseId')
  deleteUser(@Request() req: RequestWithUser, @Param('firebaseId') firebaseId: string) {
    const payload = { firebaseId };
    return this.authClient.send({ cmd: 'delete_user' }, payload);
  }

  @ApiOperation({ summary: 'Get details for a ConTech user' })
  @Get('users/:firebaseId')
  getUser(@Param('firebaseId') firebaseId: string) {
    return this.contechClient.send({ cmd: 'get_contech_user' }, { userId: firebaseId });
  }

  @ApiOperation({ summary: 'Update a ConTech user' })
  @Patch('users/:firebaseId')
  updateUser(@Param('firebaseId') firebaseId: string, @Body() body: any) {
    return this.contechClient.send({ cmd: 'update_contech_user' }, { userId: firebaseId, data: body });
  }
}
