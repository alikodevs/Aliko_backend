import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  message: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
