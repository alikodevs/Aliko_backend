import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt } from "class-validator";

export class CreatePortfolioDto {
  @IsString()
  @IsNotEmpty()
  portal: string; // professional, social

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  mediaType: string; // image, video

  @IsString()
  @IsNotEmpty()
  mediaUrl: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
