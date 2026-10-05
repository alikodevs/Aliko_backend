import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateProjectDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  fileType?: string;

  @IsBoolean()
  @IsOptional()
  isVisibleToClient?: boolean;
}
