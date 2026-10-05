import * as Joi from 'joi';

export const CreateCohortSchema = Joi.object({
  dto: Joi.object({
    name: Joi.string()
      .required()
      .description('The name of the cohort (e.g., Spring 2024)'),
    startDate: Joi.date()
      .required()
      .description('The scheduled start date for the cohort'),
    endDate: Joi.date()
      .required()
      .description('The scheduled end date for the cohort'),
    courseId: Joi.number()
      .integer()
      .required()
      .description('The ID of the course this cohort belongs to'),
    maxCapacity: Joi.number()
      .integer()
      .optional()
      .description('Maximum number of students allowed in this cohort'),
  })
    .required()
    .description('Cohort creation details'),
  user: Joi.any()
    .required()
    .description('The authenticated user (Instructor or Admin)'),
}).description('Schema for creating a new cohort');

export const UpdateCohortSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the cohort to update'),
  dto: Joi.object({
    name: Joi.string().optional().description('The updated name'),
    startDate: Joi.date().optional().description('The updated start date'),
    endDate: Joi.date().optional().description('The updated end date'),
    courseId: Joi.number()
      .integer()
      .optional()
      .description('The updated course ID'),
    maxCapacity: Joi.number()
      .integer()
      .optional()
      .description('The updated capacity'),
  })
    .required()
    .description('Cohort update details'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for updating an existing cohort');

export const CohortIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the cohort'),
  user: Joi.any().optional().description('The authenticated user'),
}).description('Schema for operations requiring a single cohort ID');

export const FindCohortsSchema = Joi.object({
  query: Joi.object()
    .optional()
    .default({})
    .description('Pagination and filter queries'),
  user: Joi.any().optional().description('The authenticated user'),
}).description('Schema for fetching lists of cohorts');

export const InstructorOnlyEventsSchema = Joi.object({
  user: Joi.any()
    .required()
    .description('The authenticated user (must be Instructor or Admin)'),
  query: Joi.object().optional().default({}).description('Additional filters'),
}).description('Schema for instructor-context cohort operations');
