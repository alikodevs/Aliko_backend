import * as Joi from 'joi';
import { SupportTicketCategory, SupportTicketStatus } from '@prisma/client/academy';

export const createSupportTicketSchema = Joi.object({
  dto: Joi.object({
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
  }).required(),
  user: Joi.object().required(),
});

export const updateSupportTicketSchema = Joi.object({
  dto: Joi.object({
    ticketId: Joi.number().integer().positive().required(),
    status: Joi.string()
      .valid(...Object.values(SupportTicketStatus))
      .optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
    resolution: Joi.string().allow('', null).optional(),
  }).required(),
  user: Joi.object().required(),
});

export const listSupportTicketsSchema = Joi.object({
  dto: Joi.object({
    category: Joi.string()
      .valid(...Object.values(SupportTicketCategory))
      .optional(),
    status: Joi.string()
      .valid(...Object.values(SupportTicketStatus))
      .optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }).required(),
  user: Joi.object().required(),
});
