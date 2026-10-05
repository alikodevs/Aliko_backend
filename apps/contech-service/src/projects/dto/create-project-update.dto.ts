import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateProjectUpdateDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  isVisibleToClient?: boolean;
}

export class UpdateProjectProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
