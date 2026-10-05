import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExerciseType } from '../../generated/client';

export class CreateExerciseDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  moduleId: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  lessonId?: number;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsEnum(ExerciseType)
  type: ExerciseType;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  options?: any; // JSON

  @ValidateIf((o) => o.type !== 'SHORT_TEXT')
  @IsNotEmpty({
    message: 'Correct answer is required for auto-graded exercises',
  })
  correctAnswer?: any; // JSON

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hints?: string[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  points?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  order?: number;
}
