import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsNumber,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'Advanced NestJS' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated short description' })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional({ example: 'Updated long description' })
  @IsString()
  @IsOptional()
  longDescription?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Course thumbnail image',
  })
  @IsOptional()
  thumbnail?: any;

  @ApiPropertyOptional({ example: 'Backend' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    enum: ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'ARCHIVED'],
    example: 'PUBLISHED',
  })
  @IsEnum(['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'ARCHIVED'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: ['Skill 1', 'Skill 2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({ example: ['Concept 1', 'Concept 2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conceptsLearned?: string[];

  @ApiPropertyOptional({ example: ['Outcome 1', 'Outcome 2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  outcomes?: string[];

  @ApiPropertyOptional({ example: 40 })
  @Type(() => Number)
  @Transform(({ value }) => (value === '' ? null : value))
  @IsInt()
  @IsOptional()
  estimatedTime?: number;

  @ApiPropertyOptional({ example: 'Beginner' })
  @IsString()
  @IsOptional()
  targetLevel?: string;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @Transform(({ value }) => (value === '' ? null : value))
  @IsInt()
  @IsOptional()
  enrolledNum?: number;

  @ApiPropertyOptional({ example: 4.5 })
  @Type(() => Number)
  @Transform(({ value }) => (value === '' ? null : value))
  @IsNumber()
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ example: 499.99 })
  @Type(() => Number)
  @Transform(({ value }) => (value === '' ? null : value))
  @IsNumber()
  @IsOptional()
  price?: number | null;

  @ApiPropertyOptional({ example: 49.99 })
  @Type(() => Number)
  @Transform(({ value }) => (value === '' ? null : value))
  @IsNumber()
  @IsOptional()
  priceInUsd?: number | null;

  @ApiPropertyOptional({ example: ['Prerequisite 1'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  prerequisites?: string[];

  @ApiPropertyOptional({ example: ['English'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @ApiPropertyOptional({ example: 'instructor-id' })
  @IsString()
  @IsOptional()
  instructorId?: string;
}
