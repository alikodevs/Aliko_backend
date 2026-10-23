import * as Joi from 'joi';

export const generateCertificateSchema = Joi.object({
  dto: Joi.object({
    cohortId: Joi.number().integer().positive().required(),
    userId: Joi.string().optional(),
    directorName: Joi.string().optional(),
    directorRnLicense: Joi.string().optional(),
  }).required(),
  user: Joi.object().required(),
});

export const verifyCertificateSchema = Joi.object({
  dto: Joi.object({
    certificateNumber: Joi.string().trim().required(),
  }).required(),
  user: Joi.any().optional(),
});
