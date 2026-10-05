import { IsInt, IsOptional, IsString } from 'class-validator';
// import { ContentType } from '../../generated/client';

export class ContentStreamDto {
  @IsInt()
  contentId: number;

  @IsOptional()
  @IsString()
  quality?: string; // 'low', 'medium', 'high', 'auto'

  @IsOptional()
  @IsString()
  format?: string; // 'mp4', 'webm', 'pdf', etc.

  @IsOptional()
  @IsInt()
  startTime?: number; // for video content, start time in seconds
}

export class ContentAccessDto {
  @IsInt()
  contentId: number;

  @IsOptional()
  @IsString()
  deviceId?: string; // for tracking access

  @IsOptional()
  @IsString()
  userAgent?: string; // browser/client info
}

export class ContentProgressDto {
  @IsInt()
  contentId: number;

  @IsInt()
  progress: number; // percentage completed (0-100)

  @IsOptional()
  @IsInt()
  timeSpent?: number; // time spent in seconds

  @IsOptional()
  @IsString()
  lastPosition?: string; // for video/audio, last position
}
