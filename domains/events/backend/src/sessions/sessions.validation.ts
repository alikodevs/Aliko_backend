import * as Joi from "joi";

export const CreateSessionSchema = Joi.object({
  dto: Joi.object({
    eventId: Joi.string().required(),
    title: Joi.string().required(),
    speakerName: Joi.string().optional().allow(null, ""),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().required(),
  }).required(),
  user: Joi.any().required(),
});

export const SessionIdSchema = Joi.object({
  id: Joi.string().required(),
  user: Joi.any().required(),
});
