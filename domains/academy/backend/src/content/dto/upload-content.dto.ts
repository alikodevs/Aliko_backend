import { IsEnum, IsInt, IsString, IsOptional } from 'class-validator';
import { ContentType } from '../../generated/client';

export class UploadContentDto {
  @IsString()
  title: string;

  @IsString()
  type: string;

  @IsInt()
  lessonId: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  contentUrl?: string;
}
