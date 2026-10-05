import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber } from "class-validator";

export class CreateRegistrationDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  attendeeName: string;

  @IsEmail()
  @IsNotEmpty()
  attendeeEmail: string;

  @IsString()
  @IsOptional()
  ticketId?: string;

  @IsNumber()
  @IsOptional()
  totalPaid?: number;
}
