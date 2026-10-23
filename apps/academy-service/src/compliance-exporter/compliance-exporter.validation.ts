import * as Joi from 'joi';

export const generateComplianceDossierSchema = Joi.object({
  dto: Joi.object({
    courseId: Joi.number().integer().positive().required(),
    cohortId: Joi.number().integer().positive().optional(),
  }).required(),
  user: Joi.object().required(),
});
