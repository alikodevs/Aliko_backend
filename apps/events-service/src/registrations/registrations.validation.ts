import * as Joi from "joi";

export const CreateRegistrationSchema = Joi.object({
  dto: Joi.object({
    eventId: Joi.string().required(),
    attendeeName: Joi.string().required(),
    attendeeEmail: Joi.string().email().required(),
    ticketId: Joi.string().optional().allow(null),
    // Ignored server-side; price comes from the ticket tier
    totalPaid: Joi.number().optional(),
  }).required(),
  user: Joi.any().optional(), // Can be anonymous
});

export const RegistrationIdSchema = Joi.object({
  id: Joi.string().required(),
  user: Joi.any().required(),
});

export const EventIdSchema = Joi.object({
  id: Joi.string().required(),
  user: Joi.any().required(),
});

export const CheckInAttendeeSchema = Joi.object({
  id: Joi.string().required(),
  registrationId: Joi.string().required(),
  user: Joi.any().required(),
});

export const UserOnlySchema = Joi.object({
  user: Joi.any().required(),
});
