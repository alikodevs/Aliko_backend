import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceReportQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cohortId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  courseId?: number;
}
