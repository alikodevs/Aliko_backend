import { IsEnum, IsInt, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// Define ContentType enum locally to avoid Prisma dependency
export enum ContentType {
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
  TEXT = 'TEXT',
}

export class UploadContentDto {
  @IsString()
  title!: string;

  @IsString()
  type!: string;

  @IsInt()
  @Type(() => Number)
  lessonId!: number;

  @IsOptional()
  @IsString()
  description?: string;
}