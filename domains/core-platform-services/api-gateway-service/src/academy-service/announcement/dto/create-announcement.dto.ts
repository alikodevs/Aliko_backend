import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'New Term Starts Soon', description: 'The title of the announcement' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'The new term starts on September 1st. Get ready!', description: 'The main body content' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
