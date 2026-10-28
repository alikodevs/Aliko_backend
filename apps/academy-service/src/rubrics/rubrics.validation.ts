import * as Joi from 'joi';

const levelSchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  points: Joi.number().min(0).required(),
  order: Joi.number().integer().min(0).default(0),
});

const criterionSchema = Joi.object({
  id: Joi.string().optional(),
  title: Joi.string().required(),
  description: Joi.string().allow('', null).optional(),
  maxPoints: Joi.number().positive().required(),
  order: Joi.number().integer().min(0).default(0),
  levels: Joi.array().items(levelSchema).optional(),
});

const createRubricDtoSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  description: Joi.string().allow('', null).optional(),
  type: Joi.string().valid('DISCUSSION', 'ASSIGNMENT').required(),
  isActive: Joi.boolean().optional(),
  criteria: Joi.array().items(criterionSchema).min(1).required(),
});

export const createRubricSchema = Joi.alternatives().try(
  Joi.object({
    dto: createRubricDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  createRubricDtoSchema
);

const updateRubricDtoSchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().min(2).max(150).optional(),
  description: Joi.string().allow('', null).optional(),
  type: Joi.string().valid('DISCUSSION', 'ASSIGNMENT').optional(),
  isActive: Joi.boolean().optional(),
  criteria: Joi.array().items(criterionSchema).optional(),
});

export const updateRubricSchema = Joi.alternatives().try(
  Joi.object({
    dto: updateRubricDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  updateRubricDtoSchema
);

const listRubricsDtoSchema = Joi.object({
  type: Joi.string().valid('DISCUSSION', 'ASSIGNMENT').optional(),
  isActive: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
  search: Joi.string().allow('', null).optional(),
  page: Joi.alternatives().try(Joi.number().integer().min(1), Joi.string().regex(/^\d+$/)).default(1),
  limit: Joi.alternatives().try(Joi.number().integer().min(1).max(100), Joi.string().regex(/^\d+$/)).default(20),
});

export const listRubricsSchema = Joi.alternatives().try(
  Joi.object({
    dto: listRubricsDtoSchema.optional(),
    user: Joi.object().optional(),
  }),
  listRubricsDtoSchema
);

const cloneRubricDtoSchema = Joi.object({
  rubricId: Joi.string().optional(),
  newName: Joi.string().allow('', null).optional(),
});

export const cloneRubricSchema = Joi.alternatives().try(
  Joi.object({
    dto: cloneRubricDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  cloneRubricDtoSchema
);

const evaluateWithRubricDtoSchema = Joi.object({
  rubricId: Joi.string().required(),
  scores: Joi.array()
    .items(
      Joi.object({
        criterionId: Joi.string().required(),
        levelId: Joi.string().optional(),
        points: Joi.number().min(0).required(),
        feedback: Joi.string().allow('', null).optional(),
      }),
    )
    .optional(),
  criteriaScores: Joi.array()
    .items(
      Joi.object({
        criterionId: Joi.string().required(),
        levelId: Joi.string().optional(),
        points: Joi.number().min(0).required(),
        feedback: Joi.string().allow('', null).optional(),
      }),
    )
    .optional(),
  studentId: Joi.string().optional(),
  evaluatorId: Joi.string().optional(),
  overallFeedback: Joi.string().allow('', null).optional(),
  selectedLevelIds: Joi.array().items(Joi.string()).optional(),
  customFeedback: Joi.string().allow('', null).optional(),
}).or('scores', 'criteriaScores', 'selectedLevelIds');

export const evaluateWithRubricSchema = Joi.alternatives().try(
  Joi.object({
    dto: evaluateWithRubricDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  evaluateWithRubricDtoSchema
);

