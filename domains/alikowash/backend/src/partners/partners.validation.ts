import * as Joi from "joi";

export const CreatePartnerSchema = Joi.object({
  orgName: Joi.string().required(),
  orgFullName: Joi.string().allow(null, ""),
  role: Joi.string().allow(null, ""),
  category: Joi.string().allow(null, ""),
  logoUrl: Joi.string().allow(null, ""),
  websiteUrl: Joi.string().uri().allow(null, ""),
  displayOrder: Joi.number().default(0),
  isPublished: Joi.boolean().default(true),
});

export const UpdatePartnerSchema = Joi.object({
  orgName: Joi.string(),
  orgFullName: Joi.string().allow(null, ""),
  role: Joi.string().allow(null, ""),
  category: Joi.string().allow(null, ""),
  logoUrl: Joi.string().allow(null, ""),
  websiteUrl: Joi.string().uri().allow(null, ""),
  displayOrder: Joi.number(),
  isPublished: Joi.boolean(),
});

export const PartnerIdSchema = Joi.object({
  id: Joi.string().guid().required(),
});
