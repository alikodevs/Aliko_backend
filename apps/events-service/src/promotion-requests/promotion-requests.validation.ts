import * as Joi from "joi";

export const CreatePromotionRequestSchema = Joi.object({
  companyName: Joi.string().required().description("Legal name of the company"),
  contactPerson: Joi.string()
    .required()
    .description("Name of the primary contact person"),
  email: Joi.string().email().required().description("Business email address"),
  phoneNumber: Joi.string()
    .optional()
    .allow("", null)
    .description("Contact phone number"),
  type: Joi.string()
    .valid("EVENT", "ANNOUNCEMENT", "NEWS")
    .required()
    .description("Type of content to promote"),
  organization: Joi.string().optional().allow("", null),
  event_type: Joi.string().optional().allow("", null),
  estimatedAttendees: Joi.string().optional().allow("", null),
  preferredDate: Joi.date().optional().allow("", null),
  location: Joi.string().optional().allow("", null),
  message: Joi.string()
    .required()
    .description("Brief description of the promotion or company"),
  userId: Joi.string().optional().allow(null, ""),
}).description("Schema for creating a promotion inquiry");

export const PromotionRequestIdSchema = Joi.object({
  id: Joi.string()
    .required()
    .description("Unique identifier of the promotion request"),
  user: Joi.any().required().description("Authenticated user context"),
}).description("Schema for operations requiring a promotion request ID");
