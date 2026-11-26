import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonType } from '@prisma/client/academy';
import { CreateContentDto } from '../../content/dto/create-content.dto';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsEnum(LessonType)
  type: LessonType;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @IsInt()
  moduleId: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContentDto)
  contents?: CreateContentDto[];

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  unlockRules?: any;

  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @IsOptional()
  @IsString()
  hourType?: string;

  @IsOptional()
  @IsBoolean()
  countsTowardSeatTime?: boolean;

  @IsOptional()
  @IsString()
  mappedCompetency?: string;

  @IsOptional()
  @IsInt()
  crosswalkRow?: number;
}
