import { InspectionStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ChecklistItemDto } from './check-list-item.dto';
import { Type } from 'class-transformer';

export class CreateInspectionDto {
  @IsInt()
  @IsNotEmpty()
  projectId: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  inspectorId?: string;

  @IsEnum(InspectionStatus)
  @IsOptional()
  status: InspectionStatus;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist: ChecklistItemDto[];

  @IsOptional()
  isVisibleToClient?: boolean;

  // @IsArray()
  // @IsOptional()
  // @Type(()=> String)
  // photos: string;
}
