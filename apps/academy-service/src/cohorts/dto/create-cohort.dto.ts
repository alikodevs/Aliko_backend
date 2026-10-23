import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCohortDto {
  @IsString()
  name: string;

  @IsInt()
  courseId: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsInt()
  maxCapacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedInstructorIds?: string[];

  @IsOptional()
  @IsBoolean()
  isHighSchoolTenMonth?: boolean;
}
