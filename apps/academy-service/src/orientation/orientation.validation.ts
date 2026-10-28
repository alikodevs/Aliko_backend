import * as Joi from 'joi';

const completeOrientationDtoSchema = Joi.object({
  cohortId: Joi.number().integer().required(),
  orientationAttended: Joi.boolean().valid(true).required(),
  lmsTutorialCompleted: Joi.boolean().valid(true).required(),
  netiquetteSigned: Joi.boolean().valid(true).required(),
});

export const CompleteOrientationSchema = Joi.alternatives().try(
  Joi.object({
    dto: completeOrientationDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  completeOrientationDtoSchema
);

export const OrientationStatusSchema = Joi.alternatives().try(
  Joi.object({
    cohortId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    cohortId: Joi.number().integer().required(),
  })
);
