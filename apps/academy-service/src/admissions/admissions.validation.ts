import * as Joi from 'joi';

const submitApplicationDtoSchema = Joi.object({
  cohortId: Joi.number().integer().required(),
  backgroundCheckUrl: Joi.string().uri().optional().allow('', null),
  tbTestProofUrl: Joi.string().uri().optional().allow('', null),
  immunizationProofUrl: Joi.string().uri().optional().allow('', null),
  cprCertUrl: Joi.string().uri().optional().allow('', null),
  idDocUrl: Joi.string().uri().optional().allow('', null),
  highSchoolProofUrl: Joi.string().uri().optional().allow('', null),
});

export const SubmitApplicationSchema = Joi.alternatives().try(
  Joi.object({
    dto: submitApplicationDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  submitApplicationDtoSchema
);

const signAgreementDtoSchema = Joi.object({
  cohortId: Joi.number().integer().required(),
  signatureUrl: Joi.string().required(),
  disclosuresAcknowledged: Joi.boolean().valid(true).required(),
});

export const SignAgreementSchema = Joi.alternatives().try(
  Joi.object({
    dto: signAgreementDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  signAgreementDtoSchema
);

const reviewApplicationDtoSchema = Joi.object({
  applicationId: Joi.number().integer().required(),
  status: Joi.string().valid('APPROVED', 'REJECTED', 'PENDING').required(),
  rejectionReason: Joi.string().optional().allow('', null),
});

export const ReviewApplicationSchema = Joi.alternatives().try(
  Joi.object({
    dto: reviewApplicationDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  reviewApplicationDtoSchema
);

export const CohortAdmissionsSchema = Joi.alternatives().try(
  Joi.object({
    cohortId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    cohortId: Joi.number().integer().required(),
  })
);

export const UserOnlyAdmissionsSchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any().optional(),
    cohortId: Joi.number().integer().optional(),
  }),
  Joi.object({
    cohortId: Joi.number().integer().optional(),
  })
);
