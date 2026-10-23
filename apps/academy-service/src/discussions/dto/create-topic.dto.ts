import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDiscussionTopicDto {
  @IsInt()
  moduleId: number;

  @IsString()
  title: string;

  @IsString()
  prompt: string;

  @IsOptional()
  rubric?: any;

  @IsOptional()
  @IsNumber()
  maxPoints?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
