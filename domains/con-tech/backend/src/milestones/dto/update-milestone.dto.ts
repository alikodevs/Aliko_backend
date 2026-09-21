import { IsString, IsOptional, IsEnum } from 'class-validator';
import { MilestoneStatus } from '@prisma/client';

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  isVisibleToClient?: boolean;
}
