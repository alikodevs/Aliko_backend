import * as Joi from 'joi';

const userSchema = Joi.any()
  .optional()
  .description('The authenticated user performing the action');

const startConversationDtoSchema = Joi.object({
  recipientId: Joi.string().required(),
  courseId: Joi.number().integer().optional(),
});

export const StartConversationSchema = Joi.alternatives().try(
  Joi.object({
    dto: startConversationDtoSchema.required(),
    user: userSchema,
  }),
  startConversationDtoSchema
);

export const ConversationIdSchema = Joi.alternatives().try(
  Joi.object({
    conversationId: Joi.number().integer().required(),
    user: userSchema,
  }),
  Joi.object({
    conversationId: Joi.number().integer().required(),
  })
);

export const ListMessagesSchema = Joi.alternatives().try(
  Joi.object({
    conversationId: Joi.number().integer().required(),
    cursor: Joi.number().integer().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    user: userSchema,
  }),
  Joi.object({
    conversationId: Joi.number().integer().required(),
    cursor: Joi.number().integer().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  })
);

const sendMessageDtoSchema = Joi.object({
  body: Joi.string().trim().min(1).max(5000).required(),
});

export const SendMessageSchema = Joi.alternatives().try(
  Joi.object({
    conversationId: Joi.number().integer().optional(),
    dto: sendMessageDtoSchema.required(),
    user: userSchema,
  }),
  sendMessageDtoSchema
);

export const UserOnlyChatSchema = Joi.alternatives().try(
  Joi.object({
    user: userSchema,
  }),
  Joi.object().unknown(true)
);
