import * as Joi from 'joi';

const submitSurveyDtoSchema = Joi.object({
  cohortId: Joi.number().integer().positive().required(),
  courseRating: Joi.number().integer().min(1).max(5).required(),
  platformRating: Joi.number().integer().min(1).max(5).required(),
  instructorRating: Joi.number().integer().min(1).max(5).required(),
  comments: Joi.string().allow('', null).optional(),
});

export const submitSurveySchema = Joi.alternatives().try(
  Joi.object({
    dto: submitSurveyDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  submitSurveyDtoSchema
);

const getCohortSurveysDtoSchema = Joi.object({
  cohortId: Joi.number().integer().positive().required(),
});

export const getCohortSurveysSchema = Joi.alternatives().try(
  Joi.object({
    dto: getCohortSurveysDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  getCohortSurveysDtoSchema
);
