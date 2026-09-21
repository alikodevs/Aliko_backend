import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAnnouncementDto {
  @ApiPropertyOptional({
    example: 'Updated Term Starts Soon',
    description: 'The updated title of the announcement',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated details: Term starts on September 15th.',
    description: 'The updated content body of the announcement',
  })
  @IsString()
  @IsOptional()
  content?: string;
}
