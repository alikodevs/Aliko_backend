import { InspectionStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateInspectionDto {
  @IsInt()
  id: number;

  @IsString()
  @IsOptional()
  inspector?: string;

  @IsEnum(InspectionStatus)
  @IsOptional()
  status?: InspectionStatus;

  @IsOptional()
  isVisibleToClient?: boolean;
}
