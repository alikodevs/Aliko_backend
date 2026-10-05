import { IsInt, IsString, IsOptional } from 'class-validator';

export class CreateCourseModuleDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsInt() courseId: number;

  @IsOptional()
  @IsInt()
  order?: number;
}
