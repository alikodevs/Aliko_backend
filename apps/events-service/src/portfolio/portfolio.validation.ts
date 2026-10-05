import * as Joi from "joi";

export const CreatePortfolioSchema = Joi.object({
  dto: Joi.object({
    portal: Joi.string().valid("professional", "social").required(),
    category: Joi.string().required(),
    title: Joi.string().required(),
    description: Joi.string().optional().allow("", null),
    mediaType: Joi.string().valid("image", "video").required(),
    mediaUrl: Joi.string().required(),
    thumbnailUrl: Joi.string().optional().allow("", null),
    sortOrder: Joi.number().optional().default(0),
  }).required(),
  user: Joi.any().required(),
});

export const PortfolioIdSchema = Joi.object({
  id: Joi.string().required(),
  user: Joi.any().required(),
});
