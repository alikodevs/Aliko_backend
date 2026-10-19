import { PartialType } from "@nestjs/mapped-types";
import { CreatePostDto } from "./create-post.dto";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PostStatus } from '@prisma/client/events';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
