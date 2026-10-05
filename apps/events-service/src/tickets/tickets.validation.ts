import * as Joi from "joi";

export const CreateTicketSchema = Joi.object({
  dto: Joi.object({
    eventId: Joi.string().required().description("ID of the event"),
    name: Joi.string().required().description("Name of the ticket tier (e.g., General Admission)"),
    price: Joi.number().min(0).required().description("Price of the ticket"),
    quantity: Joi.number().integer().min(1).default(100).description("Available quantity"),
  }).required(),
  user: Joi.any().required().description("Authenticated user context"),
});

export const TicketIdSchema = Joi.object({
  id: Joi.string().required().description("Unique identifier of the ticket"),
  dto: Joi.object().optional().description("Update data for the ticket"),
  user: Joi.any().required().description("Authenticated user context"),
});
