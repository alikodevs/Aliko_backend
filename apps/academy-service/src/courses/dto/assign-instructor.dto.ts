import { IsString } from 'class-validator';

export class AssignInstructorDto {
  @IsString()
  instructorId: string;
}
