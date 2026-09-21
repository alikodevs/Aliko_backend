import * as Joi from "joi";

export const CreateDonationSchema = Joi.object({
  donorName: Joi.string().required(),
  email: Joi.string().email().required(),
  country: Joi.string().allow(null, ""),
  amount: Joi.number().positive().required(),
  currency: Joi.string().default("USD"),
  message: Joi.string().allow(null, ""),
  status: Joi.string().default("pending"),
});

export const DonationIdSchema = Joi.object({
  id: Joi.string().guid().required(),
});

export const UpdateDonationStatusSchema = Joi.object({
  status: Joi.string().required(),
});
