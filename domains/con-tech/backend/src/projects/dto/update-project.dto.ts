import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  manager?: string;

  @IsString()
  @IsOptional()
  inspectorId?: string;

  @IsString()
  @IsOptional()
  contractorId?: string;

  @IsOptional()
  photos?: string[];

  @IsNumber()
  @IsOptional()
  progress?: number;
}
