import { IsEmail, IsNotEmpty, IsOptional, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class SignUpDto {
	@IsEmail()
	@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
	email: string;

	@IsNotEmpty()
	@Matches(/^[A-Za-z\s]+$/, { message: 'firstname must contain only alphabetic characters' })
	@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
	firstname: string;

	@IsOptional()
	@Matches(/^[A-Za-z\s]*$/, { message: 'lastname must contain only alphabetic characters' })
	@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
	lastname?: string;

	@IsOptional()
	@MinLength(8, { message: 'password must be at least 8 characters long' })
	@Matches(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
		{ message: 'password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)' }
	)
	@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
	password?: string;
}
