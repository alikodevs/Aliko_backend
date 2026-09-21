import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class StartConversationDto {
  @ApiProperty({ description: 'Recipient firebase user id' })
  @IsString()
  recipientId: string;

  @ApiPropertyOptional({
    description: 'Optional course context for student-instructor chats',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  courseId?: number;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message body' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;
}
