import { IsBoolean, IsInt } from 'class-validator';

export class CompleteOrientationDto {
  @IsInt()
  cohortId: number;

  @IsBoolean()
  orientationAttended: boolean;

  @IsBoolean()
  lmsTutorialCompleted: boolean;

  @IsBoolean()
  netiquetteSigned: boolean;
}
