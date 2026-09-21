import * as Joi from "joi";

export const CreateProjectSchema = Joi.object({
  title: Joi.string().required(),
  location: Joi.string().required(),
  yearGc: Joi.string().allow(null, ""),
  systemType: Joi.string().allow(null, ""),
  capacityM3: Joi.number().allow(null),
  tags: Joi.array().items(Joi.string()),
  summary: Joi.string().allow(null, ""),
  description: Joi.string().allow(null, ""),
  photos: Joi.array().items(Joi.string()),
  partnerNames: Joi.array().items(Joi.string()),
  displayOrder: Joi.number().default(0),
  isPublished: Joi.boolean().default(true),
});

export const UpdateProjectSchema = Joi.object({
  title: Joi.string(),
  location: Joi.string(),
  yearGc: Joi.string().allow(null, ""),
  systemType: Joi.string().allow(null, ""),
  capacityM3: Joi.number().allow(null),
  tags: Joi.array().items(Joi.string()),
  summary: Joi.string().allow(null, ""),
  description: Joi.string().allow(null, ""),
  photos: Joi.array().items(Joi.string()),
  partnerNames: Joi.array().items(Joi.string()),
  displayOrder: Joi.number(),
  isPublished: Joi.boolean(),
});

export const ProjectIdSchema = Joi.object({
  id: Joi.string().guid().required(),
});

export const FindAllProjectsSchema = Joi.object({
  query: Joi.object({
    isPublished: Joi.string().valid("true", "false"),
    limit: Joi.number().integer().min(1).max(100),
    offset: Joi.number().integer().min(0),
  }),
});
