import * as Joi from 'joi';

export const submitSurveySchema = Joi.object({
  dto: Joi.object({
    cohortId: Joi.number().integer().positive().required(),
    courseRating: Joi.number().integer().min(1).max(5).required(),
    platformRating: Joi.number().integer().min(1).max(5).required(),
    instructorRating: Joi.number().integer().min(1).max(5).required(),
    comments: Joi.string().allow('', null).optional(),
  }).required(),
  user: Joi.object().required(),
});

export const getCohortSurveysSchema = Joi.object({
  dto: Joi.object({
    cohortId: Joi.number().integer().positive().required(),
  }).required(),
  user: Joi.object().required(),
});
