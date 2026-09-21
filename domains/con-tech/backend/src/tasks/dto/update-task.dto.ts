import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsDateString,
  IsArray,
} from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsNumber()
  @IsOptional()
  actualHours?: number;

  @IsNumber()
  @IsOptional()
  progress?: number; // 0-100%

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  dependencies?: number[];
}
