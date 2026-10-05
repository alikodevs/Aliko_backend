import * as Joi from "joi";

export const CreateSponsorSchema = Joi.object({
  dto: Joi.object({
    eventId: Joi.string().required(),
    name: Joi.string().required(),
    tier: Joi.string().optional().allow(null, ""),
    logoUrl: Joi.string().optional().allow(null, ""),
  }).required(),
  user: Joi.any().required(),
});

export const SponsorIdSchema = Joi.object({
  id: Joi.string().required(),
  user: Joi.any().required(),
});
