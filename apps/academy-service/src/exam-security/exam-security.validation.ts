import * as Joi from 'joi';

const startExamSessionDtoSchema = Joi.object({
  exerciseId: Joi.number().integer().required(),
  idPhotoUrl: Joi.string().uri().optional().allow('', null),
  webcamSnapUrl: Joi.string().uri().optional().allow('', null),
  ipAddress: Joi.string().optional().allow('', null),
  userAgent: Joi.string().optional().allow('', null),
  honorCodeAccepted: Joi.boolean().required().valid(true),
});

export const StartExamSessionSchema = Joi.alternatives().try(
  Joi.object({
    dto: startExamSessionDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  startExamSessionDtoSchema
);

const recordTabBlurDtoSchema = Joi.object({
  sessionId: Joi.number().integer().required(),
});

export const RecordTabBlurSchema = Joi.alternatives().try(
  Joi.object({
    dto: recordTabBlurDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  recordTabBlurDtoSchema
);

const endExamSessionDtoSchema = Joi.object({
  sessionId: Joi.number().integer().required(),
  score: Joi.number().min(0).optional(),
});

export const EndExamSessionSchema = Joi.alternatives().try(
  Joi.object({
    dto: endExamSessionDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  endExamSessionDtoSchema
);

const auditExamSessionDtoSchema = Joi.object({
  sessionId: Joi.number().integer().required(),
  isAudited: Joi.boolean().required(),
});

export const AuditExamSessionSchema = Joi.alternatives().try(
  Joi.object({
    dto: auditExamSessionDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  auditExamSessionDtoSchema
);

export const ExamSessionIdSchema = Joi.alternatives().try(
  Joi.object({
    sessionId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    sessionId: Joi.number().integer().required(),
  })
);

export const ExerciseExamSessionsSchema = Joi.alternatives().try(
  Joi.object({
    exerciseId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    exerciseId: Joi.number().integer().required(),
  })
);
