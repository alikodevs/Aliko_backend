import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyJobDto {
  @ApiProperty({ required: false, description: 'Optional: Full name if not set in profile' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ required: false, description: 'Optional: Email if not set in profile' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  coverLetter?: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Resume file (PDF, Doc)' })
  @IsOptional()
  resumeUrl?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsNumber()
  yearsOfExperience?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  currentTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  currentCompany?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map(s => s.trim()) : value))
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  linkedInUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  portfolioUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  additionalInfo?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsNumber()
  @IsOptional()
  salaryExpectation?: number;

  @ApiProperty({ required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  salaryCurrency?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  salaryNegotiable?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  workAuthorized?: boolean;

  @IsOptional()
  resume?: any;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  useProfileResume?: boolean;
}
