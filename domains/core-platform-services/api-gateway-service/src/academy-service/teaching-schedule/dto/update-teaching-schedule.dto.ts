import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleType } from './create-teaching-schedule.dto';

export class UpdateTeachingScheduleDto {
  @ApiPropertyOptional({
    description: 'Updated title',
    example: 'Updated Live Class',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description',
    example: 'Updated description content',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated start time',
    example: '2025-12-21T10:00:00Z',
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Updated end time',
    example: '2025-12-21T11:30:00Z',
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Updated type of schedule',
    enum: ScheduleType,
  })
  @IsOptional()
  @IsString()
  type?: ScheduleType;

  @ApiPropertyOptional({
    description: 'Updated recurring status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Updated recurrence pattern',
    example: 'DAILY',
  })
  @IsOptional()
  @IsString()
  recurrencePattern?: string;

  @ApiPropertyOptional({
    description: 'Updated associated cohort ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  cohortId?: number;
}
