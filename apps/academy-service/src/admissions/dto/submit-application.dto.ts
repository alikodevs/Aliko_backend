import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class SubmitAdmissionsApplicationDto {
  @IsInt()
  cohortId: number;

  @IsOptional()
  @IsString()
  backgroundCheckUrl?: string;

  @IsOptional()
  @IsString()
  tbTestProofUrl?: string;

  @IsOptional()
  @IsString()
  immunizationProofUrl?: string;

  @IsOptional()
  @IsString()
  cprCertUrl?: string;

  @IsOptional()
  @IsString()
  idDocUrl?: string;

  @IsOptional()
  @IsString()
  highSchoolProofUrl?: string;
}
