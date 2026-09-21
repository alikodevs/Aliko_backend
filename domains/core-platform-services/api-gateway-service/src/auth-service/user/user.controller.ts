import { Controller, Get, Inject, UseGuards, Request, Body, Patch, Delete, Param, ForbiddenException, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { Roles } from '../../common/roles/roles.decorator';
import { RoleGuard } from '../../common/roles/roles.guard';
import { GlobalRole } from '../../common/roles/roles.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../../file-upload-service/file-upload.service';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

interface AuthenticatedRequest extends Request {
    user: {
        firebaseId: string;
        globalRole: GlobalRole;
    };
}

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
    constructor(
        @Inject('AUTH_SERVICE') private authClient: ClientProxy,
        private readonly fileUploadService: FileUploadService
    ) {}

    @Get('all')
    @UseGuards(RoleGuard)
    @Roles(GlobalRole.ADMIN)
    getAllUsers(@Request() req: AuthenticatedRequest) {
        return this.authClient.send({ cmd: 'get_all_users' }, { requestingUser: req.user });
    }

    @Get('profile')
    getProfile(@Request() req: AuthenticatedRequest) {
        return this.authClient.send({ cmd: 'get_user_profile' }, { firebaseId: req.user.firebaseId });
    }

    @Patch('profile')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'profilePicture', maxCount: 1 },
        { name: 'resume', maxCount: 1 },
    ]))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update own profile' })
    async updateProfile(
        @Request() req: AuthenticatedRequest, 
        @Body() dto: UpdateUserDto,
        @UploadedFiles() files?: { profilePicture?: Express.Multer.File[], resume?: Express.Multer.File[] }
    ) {
        const profilePicture = files?.profilePicture?.[0];
        const resume = files?.resume?.[0];

        if (profilePicture) {
            const uploadResult = await this.fileUploadService.uploadFile(profilePicture, 'image');
            dto.profilePicture = uploadResult.url;
        }
        if (resume) {
            const uploadResult = await this.fileUploadService.uploadFile(resume, 'document');
            dto.resumeUrl = uploadResult.url;
        }

        // Clean up dto to remove file objects before sending to auth-service
        const cleanDto = { ...dto };
        delete (cleanDto as any).profilePicture;
        delete (cleanDto as any).resume;

        const payload = { firebaseId: req.user.firebaseId, dto: cleanDto };
        return firstValueFrom(this.authClient.send({ cmd: 'update_user_profile' }, payload));
    }

    @Patch(':id')
    @UseInterceptors(FileInterceptor('profilePicture'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update user by ID' })
    async updateUserById(
        @Request() req: AuthenticatedRequest, 
        @Param('id') id: string, 
        @Body() dto: UpdateUserDto,
        @UploadedFile() profilePicture?: Express.Multer.File
    ) {
        if (req.user.firebaseId !== id && req.user.globalRole !== GlobalRole.ADMIN) {
            throw new ForbiddenException('You can only update your own profile');
        }
        if (profilePicture) {
            const uploadResult = await this.fileUploadService.uploadFile(profilePicture, 'image');
            dto.profilePicture = uploadResult.url;
        }
        const payload = { firebaseId: id, dto };
        return firstValueFrom(this.authClient.send({ cmd: 'update_user_by_id' }, payload));
    }

    @Delete('profile')
    deleteProfile(@Request() req: AuthenticatedRequest) {
        return firstValueFrom(this.authClient.send({ cmd: 'delete_user_profile' }, { firebaseId: req.user.firebaseId }));
    }
}

