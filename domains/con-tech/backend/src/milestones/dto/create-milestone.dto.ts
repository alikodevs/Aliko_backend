import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
} from 'class-validator';
import { MilestoneStatus } from '@prisma/client';

export class CreateMilestoneDto {
  @IsNotEmpty()
  @IsInt()
  projectId: number;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  dueDate?: Date;

  @IsOptional()
  isVisibleToClient?: boolean;
}
