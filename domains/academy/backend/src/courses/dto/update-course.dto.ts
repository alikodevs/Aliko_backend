import {
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { CourseStatus } from '../../generated/client';

export class UpdateCourseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  longDescription?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conceptsLearned?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  outcomes?: string[];

  @IsInt()
  @IsOptional()
  estimatedTime?: number;

  @IsString()
  @IsOptional()
  targetLevel?: string;

  @IsInt()
  @IsOptional()
  enrolledNum?: number;

  @IsNumber()
  @IsOptional()
  rating?: number;

  @IsNumber()
  @IsOptional()
  price?: number | null;

  @IsNumber()
  @IsOptional()
  priceInUsd?: number | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  prerequisites?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @IsString()
  @IsOptional()
  instructorId?: string;
}
