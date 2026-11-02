import * as Joi from 'joi';

const createTopicDtoSchema = Joi.object({
  moduleId: Joi.number().integer().required(),
  title: Joi.string().required(),
  prompt: Joi.string().required(),
  rubric: Joi.any().optional(),
  rubricId: Joi.string().optional().allow(null),
  maxPoints: Joi.number().positive().optional().default(10),
  dueDate: Joi.date().optional().allow(null),
  dueAt: Joi.date().optional().allow(null),
});

export const CreateTopicSchema = Joi.alternatives().try(
  Joi.object({
    dto: createTopicDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  createTopicDtoSchema
);

const updateTopicDtoSchema = Joi.object({
  title: Joi.string().optional(),
  prompt: Joi.string().optional(),
  rubric: Joi.any().optional(),
  rubricId: Joi.string().optional().allow(null),
  maxPoints: Joi.number().positive().optional(),
  dueDate: Joi.date().optional().allow(null),
  dueAt: Joi.date().optional().allow(null),
});

export const UpdateTopicSchema = Joi.alternatives().try(
  Joi.object({
    topicId: Joi.number().integer().optional(),
    dto: updateTopicDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  updateTopicDtoSchema
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
  rubricId: Joi.string().optional(),
  selectedLevelIds: Joi.array().items(Joi.string()).optional(),
  criteriaScores: Joi.array().items(
    Joi.object({
      criterionId: Joi.string().required(),
      levelId: Joi.string().optional(),
      points: Joi.number().min(0).required(),
      feedback: Joi.string().optional(),
    })
  ).optional(),
  feedback: Joi.string().required().min(5),
  rubricScores: Joi.any().optional(),
  isSubstantive: Joi.boolean().optional(),
}).or('score', 'grade', 'selectedLevelIds', 'criteriaScores');

export const GradePostSchema = Joi.alternatives().try(
  Joi.object({
    postId: Joi.number().integer().optional(),
    dto: gradePostDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  gradePostDtoSchema
);
