import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExerciseType } from '@prisma/client/academy';

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
  @IsString()
  rubricId?: string;

  @IsOptional()
  @IsString()
  alternateDocUrl?: string;

  @IsOptional()
  @IsBoolean()
  isProctored?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  passingScorePercent?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  poolSize?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isWeekOneAttendanceGate?: boolean;

  @IsOptional()
  @IsString()
  courseOutcome?: string;
}
