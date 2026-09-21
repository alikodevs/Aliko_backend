import * as Joi from "joi";

export const CreateSiteSettingSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.any().required(),
});

export const UpdateSiteSettingSchema = Joi.object({
  value: Joi.any().required(),
});

export const SiteSettingKeySchema = Joi.object({
  key: Joi.string().required(),
});
