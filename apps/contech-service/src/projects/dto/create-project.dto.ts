import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  site?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  contractorId?: string;

  @IsString()
  @IsOptional()
  inspectorId?: string;
}
