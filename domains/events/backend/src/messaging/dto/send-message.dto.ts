import { IsString, IsNotEmpty, IsEnum, IsOptional } from "class-validator";

export enum TargetAudience {
  ALL = "ALL",
  CHECKED_IN = "CHECKED_IN",
  NOT_CHECKED_IN = "NOT_CHECKED_IN",
  RSVP_YES = "RSVP_YES",
  RSVP_MAYBE = "RSVP_MAYBE",
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience: TargetAudience = TargetAudience.ALL;

  @IsString()
  @IsOptional()
  replyTo?: string;
}
