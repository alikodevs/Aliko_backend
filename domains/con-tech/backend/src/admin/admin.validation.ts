import * as Joi from 'joi';
import { ContechRole } from '@prisma/client';

export const AdminDashboardSchema = Joi.object({
  user: Joi.any().required().description('The authenticated admin user domain'),
}).description('Schema for fetching admin dashboard statistics');

export const ListProfilesSchema = Joi.object({
  user: Joi.any().required().description('The authenticated admin user domain'),
  role: Joi.string()
    .valid(...Object.values(ContechRole))
    .optional()
    .description('Filter by specific role'),
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .description('Pagination page number'),
  pageSize: Joi.number()
    .integer()
    .min(1)
    .optional()
    .description('Number of profiles per page'),
}).description('Schema for listing ConTech user profiles');

export const CreateUserSchema = Joi.object({
  user: Joi.any().required(),
  email: Joi.string().email().required().trim(),
  firstname: Joi.string().required().trim(),
  lastname: Joi.string().allow(null, '').optional().trim(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('CONTRACTOR', 'CLIENT').required(),
}).description('Schema for admin-led user creation');
