import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Target user ID',
    example: 'uid_123456',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Your assignment has been graded',
  })
  @IsString()
  message!: string;

  @ApiProperty({
    description: 'Notification type',
    example: 'ASSIGNMENT',
  })
  @IsString()
  type!: string;

  @ApiPropertyOptional({
    description: 'Optional structured details linked to this notification',
    example: { courseId: 1, assignmentId: 5 },
  })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
