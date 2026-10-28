import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GradeDiscussionPostDto {
  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsNumber()
  grade?: number;

  @IsString()
  feedback: string;

  @IsOptional()
  rubricScores?: any;

  @IsOptional()
  isSubstantive?: boolean;
}

