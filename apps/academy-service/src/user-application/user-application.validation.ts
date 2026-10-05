import * as Joi from 'joi';

export const UserPromotionEventSchema = Joi.object({
  userId: Joi.string()
    .required()
    .description('The unique identifier (Firebase ID) of the user to promote'),
  role: Joi.string()
    .required()
    .description('The new role to assign to the user (e.g., INSTRUCTOR)'),
}).description('Schema for internal user promotion events');
