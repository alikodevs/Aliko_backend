import { IsString, IsNotEmpty, IsEmail, IsOptional } from "class-validator";

export class CreateRsvpDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  guestName: string;

  @IsEmail()
  @IsNotEmpty()
  guestEmail: string;

  @IsString()
  @IsNotEmpty()
  response: string; // yes, no, maybe

  @IsString()
  @IsOptional()
  plusOneName?: string;

  @IsString()
  @IsOptional()
  mealPreference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
