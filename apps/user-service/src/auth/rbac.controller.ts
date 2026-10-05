import { Controller, Get, Post, UseGuards, Req, Res } from '@nestjs/common';
import { RolesGuard } from './roles/roles.guard';
import { Roles } from './roles/roles.decorator';
import { Response } from 'express';

@Controller('rbac')
@UseGuards(RolesGuard)
export class RbacController {

  @Get('public')
  getPublicData() {
    return { message: 'Public data - no authentication required' };
  }

  @Get('user')
  @Roles('USER', 'ADMIN')
  getUserData(@Req() req) {
    return { 
      message: 'User data - requires USER or ADMIN role',
      user: req.user || 'No user attached'
    };
  }

  @Get('admin')
  @Roles('ADMIN')
  getAdminData(@Req() req) {
    return { 
      message: 'Admin data - requires ADMIN role only',
      user: req.user || 'No user attached'
    };
  }

  @Post('promote-to-admin')
  @Roles('ADMIN')
  promoteToAdmin(@Req() req, @Res() res: Response) {
    return res.json({ 
      message: 'User promotion endpoint - ADMIN only',
      user: req.user,
      promoted: true 
    });
  }

  @Get('test-roles')
  testRoles(@Req() req) {
    return { 
      message: 'Test current user role',
      user: req.user || 'No user attached',
      hasAdminRole: req.user?.globalRole === 'ADMIN',
      hasUserRole: req.user?.globalRole === 'USER'
    };
  }
}
