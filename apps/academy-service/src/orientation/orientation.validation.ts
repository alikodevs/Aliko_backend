import * as Joi from 'joi';

export const CompleteOrientationSchema = Joi.object({
  dto: Joi.object({
    cohortId: Joi.number().integer().required(),
    orientationAttended: Joi.boolean().valid(true).required(),
    lmsTutorialCompleted: Joi.boolean().valid(true).required(),
    netiquetteSigned: Joi.boolean().valid(true).required(),
  }).required(),
  user: Joi.any().required(),
});

export const OrientationStatusSchema = Joi.object({
  cohortId: Joi.number().integer().required(),
  user: Joi.any().required(),
});
