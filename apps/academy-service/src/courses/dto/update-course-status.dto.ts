import { IsEnum } from 'class-validator';
import { CourseStatus } from '../../generated/client';

export class UpdateCourseStatusDto {
  @IsEnum(CourseStatus)
  status: CourseStatus;
}
