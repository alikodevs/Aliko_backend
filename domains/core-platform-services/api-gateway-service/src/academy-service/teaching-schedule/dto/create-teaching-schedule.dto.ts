import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScheduleType {
  LIVE = 'LIVE',
  RECORDING = 'RECORDING',
  Q_AND_A = 'Q_AND_A',
  OFFICE_HOURS = 'OFFICE_HOURS',
  WORKSHOP = 'WORKSHOP',
}

export class CreateTeachingScheduleDto {
  @ApiProperty({
    description: 'Title of the schedule',
    example: 'NestJS Live Class',
  })
  @IsString()
  title!: string;

  @ApiPropertyOptional({
    description: 'Optional description of the schedule',
    example: 'Deep dive into NestJS modules',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Start time of the schedule',
    example: '2025-12-20T10:00:00Z',
  })
  @IsString()
  startTime!: string;

  @ApiProperty({
    description: 'End time of the schedule',
    example: '2025-12-20T11:30:00Z',
  })
  @IsString()
  endTime!: string;

  @ApiProperty({
    description: 'Type of schedule',
    enum: ScheduleType,
    example: ScheduleType.LIVE,
  })
  @IsString()
  type!: ScheduleType;

  @ApiProperty({ description: 'Associated course ID', example: 1 })
  @IsNumber()
  courseId!: number;

  @ApiPropertyOptional({
    description: 'Whether the schedule is recurring',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurrence pattern (if recurring)',
    example: 'WEEKLY',
  })
  @IsOptional()
  @IsString()
  recurrencePattern?: string;

  @ApiPropertyOptional({
    description: 'Optional associated cohort ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  cohortId?: number;
}
