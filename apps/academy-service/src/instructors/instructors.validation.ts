import * as Joi from 'joi';

export const RegisterCredentialSchema = Joi.object({
  dto: Joi.object({
    rnLicenseNumber: Joi.string().required().min(4).max(30),
    rnLicenseExpiration: Joi.date().iso().required(),
    yearsLongTermCareExp: Joi.number().min(0).required(),
    trainTheTrainerCertUrl: Joi.string().uri().optional(),
    wabonApprovalLetterUrl: Joi.string().uri().optional(),
  }).required(),
  user: Joi.any().required(),
});

export const UpdateCredentialSchema = Joi.object({
  dto: Joi.object({
    rnLicenseNumber: Joi.string().min(4).max(30).optional(),
    rnLicenseExpiration: Joi.date().iso().optional(),
    yearsLongTermCareExp: Joi.number().min(0).optional(),
    trainTheTrainerCertUrl: Joi.string().uri().allow('', null).optional(),
    wabonApprovalLetterUrl: Joi.string().uri().allow('', null).optional(),
  }).required(),
  user: Joi.any().required(),
});

export const ApproveInstructorSchema = Joi.object({
  dto: Joi.object({
    instructorUserId: Joi.string().required(),
  }).required(),
  user: Joi.any().required(),
});

export const InstructorUserIdSchema = Joi.object({
  instructorUserId: Joi.string().required(),
  user: Joi.any().required(),
});

export const ListInstructorsSchema = Joi.object({
  user: Joi.any().required(),
});
