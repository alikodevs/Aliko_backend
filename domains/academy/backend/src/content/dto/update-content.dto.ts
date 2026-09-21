import { IsEnum, IsInt, IsOptional, IsString, IsUrl } from 'class-validator';
import { ContentType } from '../../generated/client';

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsInt()
  lessonId?: number;
}
