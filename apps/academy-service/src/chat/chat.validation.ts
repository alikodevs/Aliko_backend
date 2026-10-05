import * as Joi from 'joi';

const userSchema = Joi.any()
  .required()
  .description('The authenticated user performing the action');

export const StartConversationSchema = Joi.object({
  dto: Joi.object({
    recipientId: Joi.string().required(),
    courseId: Joi.number().integer().optional(),
  }).required(),
  user: userSchema,
});

export const ConversationIdSchema = Joi.object({
  conversationId: Joi.number().integer().required(),
  user: userSchema,
});

export const ListMessagesSchema = Joi.object({
  conversationId: Joi.number().integer().required(),
  cursor: Joi.number().integer().optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  user: userSchema,
});

export const SendMessageSchema = Joi.object({
  conversationId: Joi.number().integer().required(),
  dto: Joi.object({
    body: Joi.string().trim().min(1).max(5000).required(),
  }).required(),
  user: userSchema,
});

export const UserOnlyChatSchema = Joi.object({
  user: userSchema,
});
