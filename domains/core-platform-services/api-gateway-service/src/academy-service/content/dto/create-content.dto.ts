import { IsEnum, IsInt, IsString, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from './upload-content.dto';

export class CreateContentDto {
  @ApiProperty({ example: 'Introduction Video' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'VIDEO' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ example: 'https://example.com/video.mp4' })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  lessonId?: number;

  @ApiPropertyOptional({ example: 'Lesson body text' })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  order?: number;
}