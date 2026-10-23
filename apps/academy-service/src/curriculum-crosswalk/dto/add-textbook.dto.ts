import { IsInt, IsOptional, IsString } from 'class-validator';

export class AddTextbookDto {
  @IsInt()
  courseId: number;

  @IsString()
  title: string;

  @IsString()
  author: string;

  @IsOptional()
  @IsString()
  edition?: string;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsString()
  publisher?: string;
}
