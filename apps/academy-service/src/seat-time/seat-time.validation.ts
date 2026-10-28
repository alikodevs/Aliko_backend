import * as Joi from 'joi';

const MAX_HEARTBEAT_ACTIVE_SECONDS = 120;

const seatTimeHeartbeatDtoSchema = Joi.object({
  courseId: Joi.number().integer().required(),
  lessonId: Joi.number().integer().required(),
  contentId: Joi.number().integer().optional(),
  activeSeconds: Joi.number()
    .integer()
    .min(0)
    .max(MAX_HEARTBEAT_ACTIVE_SECONDS)
    .required(),
  idleSeconds: Joi.number().integer().min(0).optional().default(0),
});

export const SeatTimeHeartbeatSchema = Joi.alternatives().try(
  Joi.object({
    dto: seatTimeHeartbeatDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  seatTimeHeartbeatDtoSchema
);

export const SeatTimeSummarySchema = Joi.alternatives().try(
  Joi.object({
    courseId: Joi.number().integer().required(),
    userId: Joi.string().optional(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    courseId: Joi.number().integer().required(),
    userId: Joi.string().optional(),
  })
);

export const SeatTimeLessonSchema = Joi.alternatives().try(
  Joi.object({
    courseId: Joi.number().integer().required(),
    lessonId: Joi.number().integer().required(),
    userId: Joi.string().optional(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    courseId: Joi.number().integer().required(),
    lessonId: Joi.number().integer().required(),
    userId: Joi.string().optional(),
  })
);
