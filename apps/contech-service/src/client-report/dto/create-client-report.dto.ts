import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { KpiDto } from './kpi.dto';

export class CreateClientReportDto {
  @IsString()
  title: string;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  projectId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(5000)
  summary: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KpiDto)
  KPIs: KpiDto[];
}
