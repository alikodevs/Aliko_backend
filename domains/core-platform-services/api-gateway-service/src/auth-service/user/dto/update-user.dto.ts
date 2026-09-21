import { IsString, IsOptional, IsEmail, IsNumber, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstname?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'User profile picture' })
  @IsOptional()
  profilePicture?: any;

  @IsOptional()
  @IsString()
  bio?: string;
 
  @IsOptional()
  @IsString()
  resumeUrl?: string;
 
  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'User resume file' })
  @IsOptional()
  resume?: any;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  linkedInUrl?: string;

  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : parseInt(value, 10)))
  @IsNumber()
  yearsOfExperience?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}
