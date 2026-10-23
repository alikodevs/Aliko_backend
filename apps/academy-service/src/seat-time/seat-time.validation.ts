import * as Joi from 'joi';

/**
 * Max heartbeat interval: 120 seconds.
 * Client should send a heartbeat every 30–60 seconds.
 * Any single pulse reporting > 120s of active time is clamped server-side.
 */
const MAX_HEARTBEAT_ACTIVE_SECONDS = 120;

export const SeatTimeHeartbeatSchema = Joi.object({
  dto: Joi.object({
    courseId: Joi.number().integer().required(),
    lessonId: Joi.number().integer().required(),
    contentId: Joi.number().integer().optional(),
    activeSeconds: Joi.number()
      .integer()
      .min(0)
      .max(MAX_HEARTBEAT_ACTIVE_SECONDS)
      .required(),
    idleSeconds: Joi.number().integer().min(0).optional().default(0),
  }).required(),
  user: Joi.any().required(),
});

export const SeatTimeSummarySchema = Joi.object({
  courseId: Joi.number().integer().required(),
  userId: Joi.string().optional(),
  user: Joi.any().required(),
});

export const SeatTimeLessonSchema = Joi.object({
  courseId: Joi.number().integer().required(),
  lessonId: Joi.number().integer().required(),
  userId: Joi.string().optional(),
  user: Joi.any().required(),
});
