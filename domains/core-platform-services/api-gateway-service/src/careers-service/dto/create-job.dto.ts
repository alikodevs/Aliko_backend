import { IsString, IsEnum, IsOptional, IsNotEmpty, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
}

export enum JobStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export class CreateJobDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  requirements?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  salaryRange?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ enum: JobType, default: JobType.FULL_TIME })
  @IsEnum(JobType)
  @IsOptional()
  type?: JobType;

  @ApiProperty({ enum: JobStatus, default: JobStatus.OPEN })
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ventureId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ventureName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  qualifications?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  preferredQualifications?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : parseInt(value, 10)))
  @IsNumber()
  salaryMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : parseInt(value, 10)))
  @IsNumber()
  salaryMax?: number;

  @ApiProperty({ required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false, default: 'REMOTE' })
  @IsString()
  @IsOptional()
  workMode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  urgent?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  employmentType?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  region?: string;
}
