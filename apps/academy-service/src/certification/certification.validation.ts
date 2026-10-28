import * as Joi from 'joi';

const generateCertificateDtoSchema = Joi.object({
  cohortId: Joi.number().integer().positive().required(),
  userId: Joi.string().optional(),
  directorName: Joi.string().optional(),
  directorRnLicense: Joi.string().optional(),
});

export const generateCertificateSchema = Joi.alternatives().try(
  Joi.object({
    dto: generateCertificateDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  generateCertificateDtoSchema
);

const verifyCertificateDtoSchema = Joi.object({
  certificateNumber: Joi.string().trim().required(),
});

export const verifyCertificateSchema = Joi.alternatives().try(
  Joi.object({
    dto: verifyCertificateDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  verifyCertificateDtoSchema
);
