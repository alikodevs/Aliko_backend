import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class KpiDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string; // e.g., "Budget Variance", "Schedule Progress"

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  value: string; // e.g., "+5%", "80%", "On Track"

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  target: string; // e.g., "<2%", "100%", "On Track"
}
