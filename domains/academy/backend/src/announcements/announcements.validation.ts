import * as Joi from 'joi';

export const CreateAnnouncementSchema = Joi.object({
  dto: Joi.object({
    title: Joi.string()
      .required()
      .description('The title of the announcement'),
    content: Joi.string()
      .required()
      .description('The content body of the announcement'),
  })
    .required()
    .description('Announcement creation details'),
  user: Joi.any()
    .required()
    .description('The authenticated user (Instructor or Admin)'),
}).description('Schema for creating a new announcement');

export const FindAnnouncementsSchema = Joi.object({
  query: Joi.object()
    .optional()
    .default({})
    .description('Pagination and filter queries'),
  user: Joi.any().optional().description('The authenticated user'),
}).description('Schema for fetching announcements');

export const AnnouncementIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the announcement'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for operations requiring a single announcement ID');

