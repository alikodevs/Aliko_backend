import * as Joi from 'joi';

const registerCredentialDtoSchema = Joi.object({
  rnLicenseNumber: Joi.string().required().min(4).max(30),
  rnLicenseExpiration: Joi.date().iso().required(),
  yearsLongTermCareExp: Joi.number().min(0).required(),
  trainTheTrainerCertUrl: Joi.string().uri().optional().allow('', null),
  wabonApprovalLetterUrl: Joi.string().uri().optional().allow('', null),
});

export const RegisterCredentialSchema = Joi.alternatives().try(
  Joi.object({
    dto: registerCredentialDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  registerCredentialDtoSchema
);

const updateCredentialDtoSchema = Joi.object({
  rnLicenseNumber: Joi.string().min(4).max(30).optional(),
  rnLicenseExpiration: Joi.date().iso().optional(),
  yearsLongTermCareExp: Joi.number().min(0).optional(),
  trainTheTrainerCertUrl: Joi.string().uri().allow('', null).optional(),
  wabonApprovalLetterUrl: Joi.string().uri().allow('', null).optional(),
});

export const UpdateCredentialSchema = Joi.alternatives().try(
  Joi.object({
    dto: updateCredentialDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  updateCredentialDtoSchema
);

const approveInstructorDtoSchema = Joi.object({
  instructorUserId: Joi.string().required(),
});

export const ApproveInstructorSchema = Joi.alternatives().try(
  Joi.object({
    dto: approveInstructorDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  approveInstructorDtoSchema
);

export const InstructorUserIdSchema = Joi.alternatives().try(
  Joi.object({
    instructorUserId: Joi.string().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    instructorUserId: Joi.string().required(),
  })
);

export const ListInstructorsSchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any().optional(),
  }),
  Joi.any()
);
