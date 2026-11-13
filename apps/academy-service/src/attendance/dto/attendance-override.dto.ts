import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '@prisma/client/academy';

export class AttendanceOverrideDto {
  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RunCensusDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

