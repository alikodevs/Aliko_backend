import { ScheduleType } from '../../generated/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateTeachingScheduleDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsEnum(ScheduleType)
  type!: ScheduleType;

  @IsNumber()
  courseId!: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurrencePattern?: string;

  @IsOptional()
  @IsNumber()
  cohortId?: number;
}
