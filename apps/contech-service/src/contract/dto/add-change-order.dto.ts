import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class AddChangeOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsNumber()
  @IsNotEmpty()
  costImpact: number; // e.g., 5000 for +$5000, -200 for -$200

  @IsString()
  @IsNotEmpty()
  scheduleImpact: string; // e.g., "+10 days", "No change"
}
