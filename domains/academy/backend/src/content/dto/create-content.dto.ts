import {
  IsEnum,
  IsInt,
  IsString,
  IsUrl,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ContentType } from '../../generated/client';

export class CreateContentDto {
  @IsString()
  title: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsInt()
  lessonId?: number;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number; // in bytes

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsNumber()
  duration?: number; // for videos, in seconds

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean; // whether content is publicly accessible

  @IsOptional()
  @IsString()
  metadata?: string; // JSON string for additional metadata

  @IsOptional()
  @IsInt()
  order?: number;
}
