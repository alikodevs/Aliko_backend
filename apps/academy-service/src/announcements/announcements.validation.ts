import * as Joi from 'joi';

const createAnnouncementDtoSchema = Joi.object({
  title: Joi.string()
    .required()
    .description('The title of the announcement'),
  content: Joi.string()
    .required()
    .description('The content body of the announcement'),
});

export const CreateAnnouncementSchema = Joi.alternatives().try(
  Joi.object({
    dto: createAnnouncementDtoSchema.required().description('Announcement creation details'),
    user: Joi.any().optional().description('The authenticated user (Instructor or Admin)'),
  }),
  createAnnouncementDtoSchema
).description('Schema for creating a new announcement');

export const FindAnnouncementsSchema = Joi.alternatives().try(
  Joi.object({
    query: Joi.object()
      .optional()
      .default({})
      .description('Pagination and filter queries'),
    user: Joi.any().optional().description('The authenticated user'),
  }),
  Joi.object().unknown(true)
).description('Schema for fetching announcements');

export const AnnouncementIdSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the announcement'),
    user: Joi.any().optional().description('The authenticated user'),
  }),
  Joi.object({
    id: Joi.number().integer().required(),
  })
).description('Schema for operations requiring a single announcement ID');

export const FindOneAnnouncementSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the announcement'),
    user: Joi.any().optional().description('The authenticated user'),
  }),
  Joi.object({
    id: Joi.number().integer().required(),
  })
).description('Schema for fetching a single announcement');

const updateAnnouncementDtoSchema = Joi.object({
  title: Joi.string().optional().description('The updated title'),
  content: Joi.string().optional().description('The updated content'),
}).min(1);

export const UpdateAnnouncementSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number().integer().optional().description('The unique identifier of the announcement'),
    dto: updateAnnouncementDtoSchema.required().description('Announcement update details'),
    user: Joi.any().optional().description('The authenticated user (Instructor or Admin)'),
  }),
  updateAnnouncementDtoSchema
).description('Schema for updating an existing announcement');
