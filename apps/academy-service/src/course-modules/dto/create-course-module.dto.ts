import { IsInt, IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, IsDateString } from 'class-validator';
import { CurriculumTrack } from '@prisma/client/academy';

export class CreateCourseModuleDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsInt() courseId: number;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsEnum(CurriculumTrack)
  track?: CurriculumTrack;

  @IsOptional()
  @IsBoolean()
  isOrientationModule?: boolean;

  @IsOptional()
  @IsInt()
  unitNumber?: number;

  @IsOptional()
  @IsDateString()
  scheduledOpenDate?: string;

  @IsOptional()
  @IsNumber()
  targetTheoryHours?: number;

  @IsOptional()
  @IsNumber()
  targetLabHours?: number;

  @IsOptional()
  @IsString()
  studentGuidePages?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  characters?: string[];
}
