import * as Joi from 'joi';

export const getStudentGradeReportSchema = Joi.object({
  dto: Joi.object({
    cohortId: Joi.number().integer().positive().required(),
    userId: Joi.string().optional(),
  }).required(),
  user: Joi.object().required(),
});

export const getCohortGradebookSchema = Joi.object({
  dto: Joi.object({
    cohortId: Joi.number().integer().positive().required(),
  }).required(),
  user: Joi.object().required(),
});
