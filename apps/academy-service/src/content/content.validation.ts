import * as Joi from 'joi';
import { ContentType } from '@prisma/client/academy';

export const CreateContentSchema = Joi.alternatives().try(
  Joi.object({
    dto: Joi.object({
      title: Joi.string().required().description('The title of the content item'),
      type: Joi.string()
        .required()
        .description('The type of content (e.g., VIDEO, PDF, QUIZ)'),
      url: Joi.string()
        .allow('', null)
        .optional()
        .description('Link to the content (for external videos or files)'),
      body: Joi.string()
        .allow('', null)
        .optional()
        .description('The text body/content for articles or descriptions'),
      lessonId: Joi.number()
        .integer()
        .required()
        .description('The ID of the lesson this content belongs to'),
    })
      .required()
      .description('Content creation details'),
    user: Joi.any().optional().description('The authenticated user'),
  }).unknown(true),
  Joi.object({
    title: Joi.string().required().description('The title of the content item'),
    type: Joi.string().required(),
    url: Joi.string().allow('', null).optional(),
    body: Joi.string().allow('', null).optional(),
    lessonId: Joi.number().integer().required(),
  }).unknown(true),
).description('Schema for creating new educational content');

export const UpdateContentSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number()
      .integer()
      .optional()
      .description('The unique identifier of the content item to update'),
    dto: Joi.object({
      title: Joi.string().optional().description('The updated title'),
      type: Joi.string().optional().description('The updated type'),
      url: Joi.string().allow('', null).optional().description('The updated URL'),
      body: Joi.string().allow('', null).optional().description('The updated body text'),
      lessonId: Joi.number().integer().optional().description('The updated lesson ID'),
    })
      .required()
      .description('Content update details'),
    user: Joi.any().optional().description('The authenticated user'),
  }).unknown(true),
  Joi.object({
    title: Joi.string().optional(),
    type: Joi.string().optional(),
    url: Joi.string().allow('', null).optional(),
    body: Joi.string().allow('', null).optional(),
    lessonId: Joi.number().integer().optional(),
  }).unknown(true),
).description('Schema for updating an existing content item');

export const ContentIdSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the content'),
    user: Joi.any().optional().description('The authenticated user'),
  }).unknown(true),
  Joi.number().integer(),
  Joi.any(),
).description('Schema for operations requiring a single content ID');

export const LessonIdContentSchema = Joi.alternatives().try(
  Joi.object({
    lessonId: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the lesson'),
    user: Joi.any().optional().description('The authenticated user'),
    query: Joi.object().optional().default({}),
  }).unknown(true),
  Joi.any(),
).description('Schema for fetching content by lesson');

export const FindContentQuerySchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any().optional().description('The authenticated user'),
    query: Joi.object().optional().default({}),
  }).unknown(true),
  Joi.any(),
).description('Schema for querying content lists');

export const CourseIdContentSchema = Joi.alternatives().try(
  Joi.object({
    courseId: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the course'),
    user: Joi.any().optional().description('The authenticated user'),
  }).unknown(true),
  Joi.any(),
).description('Schema for fetching content by course');

export const UploadContentSchema = Joi.alternatives().try(
  Joi.object({
    dto: Joi.object({
      lessonId: Joi.number().integer().required(),
      type: Joi.string().required(),
      title: Joi.string().required(),
      contentUrl: Joi.string().uri().optional(),
      description: Joi.string().optional(),
    }).required(),
    file: Joi.any().optional(),
    user: Joi.any().optional(),
  }).unknown(true),
  Joi.object({
    lessonId: Joi.number().integer().required(),
    type: Joi.string().required(),
    title: Joi.string().required(),
    contentUrl: Joi.string().uri().optional(),
    description: Joi.string().optional(),
  }).unknown(true),
).description('Schema for uploading content files');

export const SearchContentSchema = Joi.alternatives().try(
  Joi.object({
    query: Joi.string().required().description('The search term or keyword'),
    type: Joi.string().optional(),
    courseId: Joi.number().integer().optional(),
    user: Joi.any().optional(),
  }).unknown(true),
  Joi.object({
    query: Joi.string().required(),
  }).unknown(true),
).description('Schema for searching across content items');
