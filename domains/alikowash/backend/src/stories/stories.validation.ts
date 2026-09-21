import * as Joi from "joi";

export const CreateStoryChapterSchema = Joi.object({
  year: Joi.number().integer().allow(null),
  projectName: Joi.string().allow(null, ""),
  storyText: Joi.string().required(),
  photos: Joi.array().items(Joi.string()),
  captions: Joi.array().items(Joi.string()),
  tags: Joi.array().items(Joi.string()),
  orderIndex: Joi.number().integer().default(0),
  isPublished: Joi.boolean().default(true),
});

export const UpdateStoryChapterSchema = Joi.object({
  year: Joi.number().integer().allow(null),
  projectName: Joi.string().allow(null, ""),
  storyText: Joi.string(),
  photos: Joi.array().items(Joi.string()),
  captions: Joi.array().items(Joi.string()),
  tags: Joi.array().items(Joi.string()),
  orderIndex: Joi.number().integer(),
  isPublished: Joi.boolean(),
});

export const StoryChapterIdSchema = Joi.object({
  id: Joi.string().guid().required(),
});
