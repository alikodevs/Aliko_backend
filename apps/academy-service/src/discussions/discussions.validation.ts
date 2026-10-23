import * as Joi from 'joi';

export const CreateTopicSchema = Joi.object({
  dto: Joi.object({
    moduleId: Joi.number().integer().required(),
    title: Joi.string().required(),
    prompt: Joi.string().required(),
    rubric: Joi.any().optional(),
    maxPoints: Joi.number().positive().optional().default(10),
    dueDate: Joi.date().optional(),
  }).required(),
  user: Joi.any().required(),
});

export const TopicIdSchema = Joi.object({
  topicId: Joi.number().integer().required(),
  user: Joi.any().required(),
});

export const ModuleIdDiscussionsSchema = Joi.object({
  moduleId: Joi.number().integer().required(),
  user: Joi.any().required(),
});

export const CreatePostSchema = Joi.object({
  dto: Joi.object({
    topicId: Joi.number().integer().required(),
    body: Joi.string().required().min(3),
    parentId: Joi.number().integer().optional(),
  }).required(),
  user: Joi.any().required(),
});

export const GradePostSchema = Joi.object({
  postId: Joi.number().integer().required(),
  dto: Joi.object({
    score: Joi.number().min(0).required(),
    feedback: Joi.string().required().min(5),
    rubricScores: Joi.any().optional(),
  }).required(),
  user: Joi.any().required(),
});
