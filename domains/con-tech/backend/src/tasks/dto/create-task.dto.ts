import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
} from 'class-validator';
import { TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @IsNumber()
  projectId: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @IsArray()
  @IsOptional()
  dependencies?: number[]; // Array of task IDs

  @IsOptional()
  isVisibleToClient?: boolean;
}
