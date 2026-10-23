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

export const createRubricSchema = Joi.object({
  dto: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    description: Joi.string().allow('', null).optional(),
    type: Joi.string().valid('DISCUSSION', 'ASSIGNMENT').required(),
    criteria: Joi.array().items(criterionSchema).min(1).required(),
  }).required(),
  user: Joi.object().required(),
});

export const updateRubricSchema = Joi.object({
  dto: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().min(2).max(150).optional(),
    description: Joi.string().allow('', null).optional(),
    type: Joi.string().valid('DISCUSSION', 'ASSIGNMENT').optional(),
    isActive: Joi.boolean().optional(),
    criteria: Joi.array().items(criterionSchema).optional(),
  }).required(),
  user: Joi.object().required(),
});

export const listRubricsSchema = Joi.object({
  dto: Joi.object({
    type: Joi.string().valid('DISCUSSION', 'ASSIGNMENT').optional(),
    isActive: Joi.boolean().optional(),
    search: Joi.string().allow('', null).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }).required(),
  user: Joi.object().required(),
});

export const cloneRubricSchema = Joi.object({
  dto: Joi.object({
    rubricId: Joi.string().required(),
    newName: Joi.string().optional(),
  }).required(),
  user: Joi.object().required(),
});

export const evaluateWithRubricSchema = Joi.object({
  dto: Joi.object({
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
      .min(1)
      .required(),
  }).required(),
  user: Joi.object().required(),
});
