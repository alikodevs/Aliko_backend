import { IsEnum, IsNotEmpty } from 'class-validator';

export class AssignRoleDto {
    @IsEnum(['USER', 'ORGANIZER', 'CONTENT_MANAGER', 'ADMIN'])
    @IsNotEmpty()
    requestedRole!: 'USER' | 'ORGANIZER' | 'CONTENT_MANAGER' | 'ADMIN';
}
