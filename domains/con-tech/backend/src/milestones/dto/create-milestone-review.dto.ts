import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { MilestoneStatus } from '@prisma/client';

export class CreateMilestoneReviewDto {
  @IsNotEmpty()
  @IsString()
  inspectorId: string;

  @IsNotEmpty()
  @IsEnum(MilestoneStatus)
  status: MilestoneStatus;

  @IsNotEmpty()
  @IsString()
  comments: string;
}
