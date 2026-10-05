import { IsString, IsNotEmpty, IsOptional, IsDateString } from "class-validator";

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  speakerName?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}
