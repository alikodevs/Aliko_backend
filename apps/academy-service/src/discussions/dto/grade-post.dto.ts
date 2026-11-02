import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CriterionScoreInput {
  criterionId: string;
  levelId?: string;
  points: number;
  feedback?: string;
}

export class GradeDiscussionPostDto {
  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsNumber()
  grade?: number;

  @IsOptional()
  @IsString()
  rubricId?: string;

  @IsOptional()
  @IsArray()
  selectedLevelIds?: string[];

  @IsOptional()
  @IsArray()
  criteriaScores?: CriterionScoreInput[];

  @IsString()
  feedback: string;

  @IsOptional()
  rubricScores?: any;

  @IsOptional()
  @IsBoolean()
  isSubstantive?: boolean;
}
