import { IsString, IsNotEmpty, IsOptional, IsIn, IsArray, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class SelectRoleDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsIn(['student', 'teacher', 'instructor'])
  role!: 'student' | 'teacher' | 'instructor';
}

class PersonalDetails {
  @IsString()
  firstname!: string;

  @IsString()
  lastname!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class InterviewResponse {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;
}

class DocumentInfo {
  @IsString()
  name!: string;

  @IsString()
  url!: string;
}

export class TeacherApplicationDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ValidateNested()
  @Type(() => PersonalDetails)
  personalDetails!: PersonalDetails;

  @IsArray()
  @IsString({ each: true })
  teachingCategories!: string[];

  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewResponse)
  interviewResponses!: InterviewResponse[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentInfo)
  documents?: DocumentInfo[];
}

export class SwitchRoleDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @IsIn(['student', 'teacher', 'instructor'])
  newRole!: 'student' | 'teacher' | 'instructor';
}
