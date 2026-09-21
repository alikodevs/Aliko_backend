import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
} from "class-validator";
import { PostType } from "../../generated/client";

export class CreatePostDto {
  @IsEnum(PostType)
  @IsNotEmpty()
  type: PostType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsDateString()
  @IsOptional()
  eventDate?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  externalLink?: string;

  @IsDateString()
  @IsOptional()
  endEventDate?: string;

  @IsString()
  @IsOptional()
  hostName?: string;

  @IsString()
  @IsOptional()
  privacy?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

