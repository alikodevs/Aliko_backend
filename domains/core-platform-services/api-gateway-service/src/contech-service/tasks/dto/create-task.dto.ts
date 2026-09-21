import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateTaskDto {
  @ApiProperty({
    description: 'ID of the project this task belongs to',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  projectId!: number;

  @ApiProperty({
    description: 'Task description',
    example: 'Design homepage layout',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Priority of the task',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'User ID assigned to this task',
    example: 'user_123',
  })
  @IsString()
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Deadline of the task',
    example: '2025-12-31',
  })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional({
    description: 'Estimated hours to complete the task',
    example: 10,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional({
    description: 'Dependencies on other task IDs',
    type: [Number],
    example: [2, 3],
  })
  @IsArray()
  @IsOptional()
  dependencies?: number[];

  @ApiPropertyOptional({
    description: 'Whether this task is visible to the client',
    example: false,
  })
  @IsOptional()
  isVisibleToClient?: boolean;
}
