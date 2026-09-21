import { CourseStatus } from '../../generated/client';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  shortDescription: string;

  @IsString()
  @IsOptional()
  longDescription: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(CourseStatus)
  status: CourseStatus;

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

  @IsInt()
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

  @IsBoolean()
  @IsOptional()
  createDefaultCohort?: boolean = false;
}
