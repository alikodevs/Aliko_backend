import { IsNotEmpty } from 'class-validator';

export class SubmitExerciseDto {
  @IsNotEmpty()
  answer: any; // JSON
}
