import { IsDateString, IsInt, IsString } from 'class-validator';

export class CreateCohortDto {
  @IsString()
  name: string;
  @IsInt()
  courseId: number;
  @IsDateString()
  startDate: string;
  @IsDateString()
  endDate: string;
}
