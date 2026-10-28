import * as Joi from 'joi';
import { SupportTicketCategory, SupportTicketStatus } from '@prisma/client/academy';

const createSupportTicketDtoSchema = Joi.object({
  category: Joi.string()
    .valid(...Object.values(SupportTicketCategory))
    .required(),
  subject: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).required(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM'),
  attachmentUrl: Joi.string().uri().allow('', null).optional(),
  clientDiagnostics: Joi.object({
    browser: Joi.string().allow('', null).optional(),
    os: Joi.string().allow('', null).optional(),
    screenResolution: Joi.string().allow('', null).optional(),
    cookiesEnabled: Joi.boolean().optional(),
    webRtcSupported: Joi.boolean().optional(),
  }).optional(),
});

export const createSupportTicketSchema = Joi.alternatives().try(
  Joi.object({
    dto: createSupportTicketDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  createSupportTicketDtoSchema
);

const updateSupportTicketDtoSchema = Joi.object({
  ticketId: Joi.number().integer().positive().optional(),
  status: Joi.string()
    .valid(...Object.values(SupportTicketStatus))
    .optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
  resolution: Joi.string().allow('', null).optional(),
});

export const updateSupportTicketSchema = Joi.alternatives().try(
  Joi.object({
    dto: updateSupportTicketDtoSchema.required(),
    user: Joi.object().optional(),
  }),
  updateSupportTicketDtoSchema
);

const listSupportTicketsDtoSchema = Joi.object({
  category: Joi.string()
    .valid(...Object.values(SupportTicketCategory))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(SupportTicketStatus))
    .optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
  page: Joi.alternatives().try(Joi.number().integer().min(1), Joi.string().regex(/^\d+$/)).default(1),
  limit: Joi.alternatives().try(Joi.number().integer().min(1).max(100), Joi.string().regex(/^\d+$/)).default(20),
});

export const listSupportTicketsSchema = Joi.alternatives().try(
  Joi.object({
    dto: listSupportTicketsDtoSchema.optional(),
    user: Joi.object().optional(),
  }),
  listSupportTicketsDtoSchema
);
