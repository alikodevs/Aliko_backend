import * as Joi from 'joi';

const createTopicDtoSchema = Joi.object({
  moduleId: Joi.number().integer().required(),
  title: Joi.string().required(),
  prompt: Joi.string().required(),
  rubric: Joi.any().optional(),
  rubricId: Joi.string().optional(),
  maxPoints: Joi.number().positive().optional().default(10),
  dueDate: Joi.date().optional(),
  dueAt: Joi.date().optional(),
});

export const CreateTopicSchema = Joi.alternatives().try(
  Joi.object({
    dto: createTopicDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  createTopicDtoSchema
);

export const TopicIdSchema = Joi.alternatives().try(
  Joi.object({
    topicId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    topicId: Joi.number().integer().required(),
  })
);

export const ModuleIdDiscussionsSchema = Joi.alternatives().try(
  Joi.object({
    moduleId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    moduleId: Joi.number().integer().required(),
  })
);

const createPostDtoSchema = Joi.object({
  topicId: Joi.number().integer().required(),
  body: Joi.string().required().min(3),
  parentId: Joi.number().integer().optional(),
});

export const CreatePostSchema = Joi.alternatives().try(
  Joi.object({
    dto: createPostDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  createPostDtoSchema
);

const gradePostDtoSchema = Joi.object({
  score: Joi.number().min(0).optional(),
  grade: Joi.number().min(0).optional(),
  feedback: Joi.string().required().min(5),
  rubricScores: Joi.any().optional(),
  isSubstantive: Joi.boolean().optional(),
}).or('score', 'grade');

export const GradePostSchema = Joi.alternatives().try(
  Joi.object({
    postId: Joi.number().integer().optional(),
    dto: gradePostDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  gradePostDtoSchema
);
