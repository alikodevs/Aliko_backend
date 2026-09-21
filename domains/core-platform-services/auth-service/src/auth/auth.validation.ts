import * as Joi from 'joi';

// Regex for password validation: min 8 chars, at least one uppercase, one lowercase, and one number or special char
const passwordRegex = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

export const SignUpSchema = Joi.object({
  email: Joi.string().email().required().trim().description('User email address'),
  firstname: Joi.string()
    .required()
    .pattern(/^[A-Za-z\s]+$/)
    .trim()
    .messages({ 'string.pattern.base': 'firstname must contain only alphabetic characters' })
    .description('User first name'),
  lastname: Joi.string()
    .optional()
    .allow(null, '')
    .pattern(/^[A-Za-z\s]*$/)
    .trim()
    .messages({ 'string.pattern.base': 'lastname must contain only alphabetic characters' })
    .description('User last name'),
  password: Joi.string()
    .min(8)
    .regex(passwordRegex)
    .required()
    .description('User password (min 8 chars, 1 upper, 1 lower, 1 digit/special)'),
}).description('Schema for user registration');

export const CreateContechUserSchema = SignUpSchema.keys({
  role: Joi.string().valid('ADMIN', 'CONTRACTOR', 'CLIENT').required().description('Specific role for ConTech domain'),
}).description('Schema for creating a ConTech domain user');

export const CreateEventsUserSchema = Joi.object({
  email: Joi.string().email().required().trim(),
  password: Joi.string().min(8).regex(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/).required(),
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  role: Joi.string().valid('ADMIN', 'CONTENT_MANAGER', 'USER', 'realtor', 'developer').required()
});

export const SignInSchema = Joi.object({
  email: Joi.string().email().required().description('Authentication email'),
  password: Joi.string().min(6).required().description('Authentication password'),
}).description('Schema for user login');

export const GoogleLoginSchema = Joi.object({
  idToken: Joi.string().required().description('Firebase Google ID Token'),
}).description('Schema for Google authentication');

export const SelectAcademyRoleSchema = Joi.object({
  userId: Joi.string().required().description('Firebase user ID'),
  role: Joi.string().valid('student', 'teacher', 'instructor').required().lowercase().description('Role selected for Academy'),
}).description('Schema for Academy role selection');

export const SwitchAcademyRoleSchema = Joi.object({
  userId: Joi.string().required().description('Firebase user ID'),
  newRole: Joi.string().valid('student', 'teacher', 'instructor').required().lowercase().description('New role to switch to'),
}).description('Schema for switching Academy roles');

export const UserStatusUpdateSchema = Joi.object({
  firebaseId: Joi.string().required().description('Firebase user ID'),
  status: Joi.string().required().description('New user status (e.g., ACTIVE, INACTIVE)'),
}).description('Schema for updating user system status');

export const UserIdentitySchema = Joi.object({
  firebaseId: Joi.string().required().description('Firebase user ID'),
}).description('Schema for operations requiring a single user identity');

export const ForgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().trim().description('User email addressed'),
  frontendUrl: Joi.string().uri().optional().description('Frontend origin for the reset link'),
  app: Joi.string().valid('academy', 'events').optional().description('Which product frontend to link'),
}).description('Schema for password reset request');

export const ResetPasswordSchema = Joi.object({
  token: Joi.string().required().description('Reset token from the email link'),
  newPassword: Joi.string()
    .min(8)
    .regex(passwordRegex)
    .required()
    .description('New password'),
  email: Joi.string().email().optional().trim().description('Optional email (must match token)'),
}).description('Schema for confirming password reset');
