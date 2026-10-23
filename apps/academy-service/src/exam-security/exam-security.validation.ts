import * as Joi from 'joi';

export const StartExamSessionSchema = Joi.object({
  dto: Joi.object({
    exerciseId: Joi.number().integer().required(),
    idPhotoUrl: Joi.string().uri().optional(),
    webcamSnapUrl: Joi.string().uri().optional(),
    ipAddress: Joi.string().optional(),
    userAgent: Joi.string().optional(),
    honorCodeAccepted: Joi.boolean().required().valid(true),
  }).required(),
  user: Joi.any().required(),
});

export const RecordTabBlurSchema = Joi.object({
  dto: Joi.object({
    sessionId: Joi.number().integer().required(),
  }).required(),
  user: Joi.any().required(),
});

export const EndExamSessionSchema = Joi.object({
  dto: Joi.object({
    sessionId: Joi.number().integer().required(),
    score: Joi.number().min(0).optional(),
  }).required(),
  user: Joi.any().required(),
});

export const AuditExamSessionSchema = Joi.object({
  dto: Joi.object({
    sessionId: Joi.number().integer().required(),
    isAudited: Joi.boolean().required(),
  }).required(),
  user: Joi.any().required(),
});

export const ExamSessionIdSchema = Joi.object({
  sessionId: Joi.number().integer().required(),
  user: Joi.any().required(),
});

export const ExerciseExamSessionsSchema = Joi.object({
  exerciseId: Joi.number().integer().required(),
  user: Joi.any().required(),
});
