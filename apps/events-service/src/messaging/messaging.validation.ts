import * as Joi from "joi";

export const SendMessageSchema = Joi.object({
  id: Joi.string().uuid().required(),
  dto: Joi.object({
    subject: Joi.string().required(),
    body: Joi.string().required(),
    targetAudience: Joi.string()
      .valid("ALL", "CHECKED_IN", "NOT_CHECKED_IN", "RSVP_YES", "RSVP_MAYBE")
      .default("ALL")
      .optional(),
    replyTo: Joi.string().email().optional(),
  }).required(),
  user: Joi.any().required(),
});

export const UserOnlySchema = Joi.object({
  user: Joi.any().required(),
});
