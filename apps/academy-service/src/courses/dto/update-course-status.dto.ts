import { IsEnum } from 'class-validator';
import { CourseStatus } from '@prisma/client/academy';

export class UpdateCourseStatusDto {
  @IsEnum(CourseStatus)
  status: CourseStatus;
}
