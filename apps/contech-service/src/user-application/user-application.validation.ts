import * as Joi from 'joi';

export const UserPromotionEventSchema = Joi.object({
  userId: Joi.string()
    .required()
    .description('The unique identifier of the user to promote'),
  role: Joi.string()
    .required()
    .description('The new role to assign to the user in ConTech'),
}).description('Schema for user promotion events in ConTech');
