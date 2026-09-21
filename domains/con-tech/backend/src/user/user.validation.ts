import * as Joi from 'joi';
import { ContechRole } from '@prisma/client';

export const GetUserProfileSchema = Joi.object({
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for fetching user profile');

export const UpdateUserProfileSchema = Joi.object({
  user: Joi.any().required().description('The authenticated user context'),
  updateData: Joi.any().required().description('Updated profile information'),
}).description('Schema for updating user profile');

export const SelectUserRoleSchema = Joi.object({
  userId: Joi.string()
    .required()
    .description('The unique identifier of the user'),
  role: Joi.string()
    .valid(...Object.values(ContechRole))
    .required()
    .description(
      'The ConTech role to assign (e.g., ADMIN, CONTRACTOR, CLIENT, INSPECTOR)',
    ),
}).description('Schema for explicit role selection');

export const UserCreatedEventSchema = Joi.object({
  userId: Joi.string().required().description('ID of the created user'),
  email: Joi.string()
    .email()
    .required()
    .description('Email of the created user'),
  role: Joi.string().required().description('Primary role assigned'),
  globalRole: Joi.string().optional().description('Global system role'),
}).description('Schema for user creation events from auth service');
