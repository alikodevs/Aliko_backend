import * as Joi from "joi";

export const CreateTeamMemberSchema = Joi.object({
  name: Joi.string().required(),
  role: Joi.string().required(),
  bio: Joi.string().allow(null, ""),
  photoUrl: Joi.string().allow(null, ""),
  displayOrder: Joi.number().integer().default(0),
  isPublished: Joi.boolean().default(true),
});

export const UpdateTeamMemberSchema = Joi.object({
  name: Joi.string(),
  role: Joi.string(),
  bio: Joi.string().allow(null, ""),
  photoUrl: Joi.string().allow(null, ""),
  displayOrder: Joi.number().integer(),
  isPublished: Joi.boolean(),
});

export const TeamMemberIdSchema = Joi.object({
  id: Joi.string().guid().required(),
});
