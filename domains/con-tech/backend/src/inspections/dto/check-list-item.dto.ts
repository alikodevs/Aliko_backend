// src/inspections/dto/create-inspection.dto.ts
import { ChecklistItemStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemDescription: string;

  @IsEnum(ChecklistItemStatus)
  @IsNotEmpty()
  status: ChecklistItemStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
