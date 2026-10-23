import * as Joi from 'joi';

export const SubmitApplicationSchema = Joi.object({
  dto: Joi.object({
    cohortId: Joi.number().integer().required(),
    backgroundCheckUrl: Joi.string().uri().optional(),
    tbTestProofUrl: Joi.string().uri().optional(),
    immunizationProofUrl: Joi.string().uri().optional(),
    cprCertUrl: Joi.string().uri().optional(),
    idDocUrl: Joi.string().uri().optional(),
    highSchoolProofUrl: Joi.string().uri().optional(),
  }).required(),
  user: Joi.any().required(),
});

export const SignAgreementSchema = Joi.object({
  dto: Joi.object({
    cohortId: Joi.number().integer().required(),
    signatureUrl: Joi.string().required(),
    disclosuresAcknowledged: Joi.boolean().valid(true).required(),
  }).required(),
  user: Joi.any().required(),
});

export const ReviewApplicationSchema = Joi.object({
  dto: Joi.object({
    applicationId: Joi.number().integer().required(),
    status: Joi.string().valid('APPROVED', 'REJECTED', 'PENDING').required(),
    rejectionReason: Joi.string().optional().allow(''),
  }).required(),
  user: Joi.any().required(),
});

export const CohortAdmissionsSchema = Joi.object({
  cohortId: Joi.number().integer().required(),
  user: Joi.any().required(),
});

export const UserOnlyAdmissionsSchema = Joi.object({
  user: Joi.any().required(),
  cohortId: Joi.number().integer().optional(),
});
