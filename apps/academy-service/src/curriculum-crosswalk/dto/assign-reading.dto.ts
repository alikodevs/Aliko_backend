import { IsInt, IsString } from 'class-validator';

export class AssignReadingDto {
  @IsInt()
  lessonId: number;

  @IsInt()
  textbookId: number;

  @IsString()
  chapters: string;

  @IsString()
  pageRange: string;
}
