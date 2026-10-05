import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonType } from '../../generated/client';
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
}
