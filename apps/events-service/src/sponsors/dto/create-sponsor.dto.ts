import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateSponsorDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  tier?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
}
