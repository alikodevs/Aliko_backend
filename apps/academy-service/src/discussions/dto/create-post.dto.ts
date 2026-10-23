import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateDiscussionPostDto {
  @IsInt()
  topicId: number;

  @IsString()
  body: string;

  @IsOptional()
  @IsInt()
  parentId?: number;
}
