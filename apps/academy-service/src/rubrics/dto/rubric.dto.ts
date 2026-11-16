import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export interface RubricLevel {
  id: string;
  criterionId: string;
  name: string;
  description: string;
  points: number;
  order: number;
}

export interface RubricCriterion {
  id: string;
  rubricId: string;
  title: string;
  description?: string;
  maxPoints: number;
  order: number;
  levels?: RubricLevel[];
}

export interface Rubric {
  id: string;
  name: string;
  description?: string;
  type: 'DISCUSSION' | 'ASSIGNMENT';
  createdBy: string;
  isActive: boolean;
  criteria?: RubricCriterion[];
}

export class CreateRubricLevelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  points: number;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateRubricCriterionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  maxPoints: number;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubricLevelDto)
  levels?: CreateRubricLevelDto[];
}

export class CreateRubricDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  type: 'DISCUSSION' | 'ASSIGNMENT';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubricCriterionDto)
  criteria?: CreateRubricCriterionDto[];
}

export class UpdateRubricLevelDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  points?: number;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateRubricCriterionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  maxPoints?: number;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRubricLevelDto)
  levels?: UpdateRubricLevelDto[];
}

export class UpdateRubricDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: 'DISCUSSION' | 'ASSIGNMENT';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRubricCriterionDto)
  criteria?: UpdateRubricCriterionDto[];
}

export class ListRubricsDto {
  @IsOptional()
  type?: 'DISCUSSION' | 'ASSIGNMENT';

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

export class CloneRubricDto {
  @IsString()
  @IsNotEmpty()
  rubricId: string;

  @IsOptional()
  @IsString()
  newName?: string;
}

export class EvaluateCriterionScoreDto {
  @IsString()
  @IsNotEmpty()
  criterionId: string;

  @IsOptional()
  @IsString()
  levelId?: string;

  @IsNumber()
  points: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class EvaluateWithRubricDto {
  @IsString()
  @IsNotEmpty()
  rubricId: string;

  @IsOptional()
  @IsArray()
  scores?: EvaluateCriterionScoreDto[];

  @IsOptional()
  @IsArray()
  criteriaScores?: EvaluateCriterionScoreDto[];

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  evaluatorId?: string;

  @IsOptional()
  @IsString()
  overallFeedback?: string;

  @IsOptional()
  @IsArray()
  selectedLevelIds?: string[];

  @IsOptional()
  @IsString()
  customFeedback?: string;
}
