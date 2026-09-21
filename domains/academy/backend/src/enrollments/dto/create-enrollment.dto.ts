import { IsInt, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEnrollmentDto {
  userId?: string;

  @ValidateIf(
    (object: CreateEnrollmentDto) =>
      object.cohortId !== undefined && object.cohortId !== null,
  )
  @IsInt()
  @Type(() => Number) 
  cohortId?: number;

  @IsInt()
  courseId: number;

  paymentGateway?: string;
}
