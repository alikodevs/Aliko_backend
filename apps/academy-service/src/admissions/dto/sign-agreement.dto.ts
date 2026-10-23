import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class SignEnrollmentAgreementDto {
  @IsInt()
  cohortId: number;

  @IsString()
  signatureUrl: string;

  @IsBoolean()
  disclosuresAcknowledged: boolean; // DSHS disqualifying crimes, refund policy, physical demands
}
