import * as Joi from 'joi';

const getStudentGradeReportDtoSchema = Joi.object({
  cohortId: Joi.number().integer().positive().required(),
  userId: Joi.string().optional(),
});

export const getStudentGradeReportSchema = Joi.alternatives().try(
  Joi.object({
    dto: getStudentGradeReportDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  getStudentGradeReportDtoSchema
);

const getCohortGradebookDtoSchema = Joi.object({
  cohortId: Joi.number().integer().positive().required(),
});

export const getCohortGradebookSchema = Joi.alternatives().try(
  Joi.object({
    dto: getCohortGradebookDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  getCohortGradebookDtoSchema
);
