import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GradeDiscussionPostDto {
  @IsNumber()
  score: number;

  @IsString()
  feedback: string;

  @IsOptional()
  rubricScores?: any;
}
