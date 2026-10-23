import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApprovalStatus } from '@prisma/client/academy';

export class ReviewAdmissionsApplicationDto {
  @IsInt()
  applicationId: number;

  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
