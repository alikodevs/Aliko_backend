import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  email!: string;

  @ApiProperty({ description: 'First name (alphabetic characters only)', example: 'John' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z\s]+$/, { message: 'firstname must contain only alphabetic characters' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  firstname!: string;

  @ApiPropertyOptional({ description: 'Last name (alphabetic characters only)', example: 'Doe' })
  @IsString()
  @IsOptional()
  @Matches(/^[A-Za-z\s]*$/, { message: 'lastname must contain only alphabetic characters' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  lastname?: string;

  @ApiPropertyOptional({ 
    description: 'Password (min 8 characters, must include uppercase, lowercase, number, and special character)', 
    example: 'Password1!' 
  })
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    { message: 'password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)' }
  )
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  password?: string;

  @ApiPropertyOptional({ description: 'Honeypot field for bot protection (should be empty)' })
  @IsString()
  @IsOptional()
  _hp?: string;
}

