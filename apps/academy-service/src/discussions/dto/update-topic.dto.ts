import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateDiscussionTopicDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  rubricId?: string;

  @IsOptional()
  rubric?: any;

  @IsOptional()
  @IsNumber()
  maxPoints?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

