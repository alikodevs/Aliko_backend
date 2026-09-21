import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MilestoneStatus } from '@prisma/client';

export class FindAllMilestonesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
