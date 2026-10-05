import { IsString, IsNotEmpty, IsEmail, IsOptional } from "class-validator";

export class CreatePromotionRequestDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsNotEmpty()
  type: string; // Event / Announcement / News

  @IsString()
  @IsOptional()
  organization?: string;

  @IsString()
  @IsOptional()
  event_type?: string;

  @IsString()
  @IsOptional()
  estimatedAttendees?: string;

  @IsString()
  @IsOptional()
  preferredDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
