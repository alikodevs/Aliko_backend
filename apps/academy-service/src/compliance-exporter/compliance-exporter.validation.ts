import * as Joi from 'joi';

const generateComplianceDossierDtoSchema = Joi.object({
  courseId: Joi.number().integer().positive().required(),
  cohortId: Joi.number().integer().positive().optional(),
});

export const generateComplianceDossierSchema = Joi.alternatives().try(
  Joi.object({
    dto: generateComplianceDossierDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  generateComplianceDossierDtoSchema
);
