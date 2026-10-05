import * as Joi from "joi";

export const CreateRsvpSchema = Joi.object({
  dto: Joi.object({
    eventId: Joi.string().required(),
    guestName: Joi.string().required(),
    guestEmail: Joi.string().email().required(),
    response: Joi.string().valid("yes", "no", "maybe").required(),
    plusOneName: Joi.string().optional().allow("", null),
    mealPreference: Joi.string().optional().allow("", null),
    notes: Joi.string().optional().allow("", null),
  }).required(),
  user: Joi.any().optional(), // Can be anonymous
});

export const UpdateRsvpStatusSchema = Joi.object({
  id: Joi.string().required(),
  dto: Joi.object({
    response: Joi.string().valid("yes", "no", "maybe").required(),
  }).required(),
  user: Joi.any().optional(),
});

export const RsvpIdSchema = Joi.object({
  id: Joi.string().required(),
  user: Joi.any().required(),
});

export const UserOnlySchema = Joi.object({
  user: Joi.any().required(),
});
