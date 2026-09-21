import * as Joi from "joi";

export const CreateContactSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow(null, ""),
  organization: Joi.string().allow(null, ""),
  country: Joi.string().allow(null, ""),
  serviceInterest: Joi.string().allow(null, ""),
  message: Joi.string().required(),
  sourcePage: Joi.string().allow(null, ""),
});

export const ContactIdSchema = Joi.object({
  id: Joi.string().guid().required(),
});
