import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'Intro to NestJS' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Learn NestJS basics' })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional({ example: 'Full NestJS course' })
  @IsString()
  @IsOptional()
  longDescription?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Course thumbnail image' })
  @IsOptional()
  thumbnail?: any;

  @ApiPropertyOptional({ example: 'Backend' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    enum: ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'ARCHIVED'],
    example: 'DRAFT',
  })
  @IsEnum(['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'ARCHIVED'])
  status!: string;

  @ApiPropertyOptional({ example: ['Skill 1', 'Skill 2'] })
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({ example: ['Concept 1', 'Concept 2'] })
  @IsOptional()
  conceptsLearned?: string[];

  @ApiPropertyOptional({ example: ['Outcome 1', 'Outcome 2'] })
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
  @IsOptional()
  prerequisites?: string[];

  @ApiPropertyOptional({ example: ['English'] })
  @IsOptional()
  languages?: string[];
}
