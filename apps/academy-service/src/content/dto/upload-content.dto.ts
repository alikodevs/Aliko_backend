import { IsInt, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadContentDto {
  @IsString()
  title: string;

  @IsString()
  type: string;

  @IsInt()
  @Type(() => Number)
  lessonId: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  contentUrl?: string;
}
