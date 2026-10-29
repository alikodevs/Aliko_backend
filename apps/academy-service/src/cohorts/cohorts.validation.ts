import * as Joi from 'joi';

const createCohortDtoSchema = Joi.object({
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
  assignedInstructorIds: Joi.array()
    .items(Joi.string())
    .optional()
    .description('List of assigned instructor user IDs for the cohort'),
  isHighSchoolTenMonth: Joi.boolean()
    .optional()
    .default(false)
    .description('Flag indicating if this cohort is a 10-month high school calendar program'),
});

export const CreateCohortSchema = Joi.alternatives().try(
  Joi.object({
    dto: createCohortDtoSchema.required().description('Cohort creation details'),
    user: Joi.any().optional().description('The authenticated user (Instructor or Admin)'),
  }),
  createCohortDtoSchema
).description('Schema for creating a new cohort');

const updateCohortDtoSchema = Joi.object({
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
  assignedInstructorIds: Joi.array()
    .items(Joi.string())
    .optional()
    .description('List of assigned instructor user IDs for the cohort'),
  isHighSchoolTenMonth: Joi.boolean().optional(),
}).min(1);

export const UpdateCohortSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number().integer().optional().description('The unique identifier of the cohort to update'),
    dto: updateCohortDtoSchema.required().description('Cohort update details'),
    user: Joi.any().optional().description('The authenticated user'),
  }),
  updateCohortDtoSchema
).description('Schema for updating an existing cohort');

export const CohortIdSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the cohort'),
    user: Joi.any().optional().description('The authenticated user'),
  }),
  Joi.object({
    id: Joi.number().integer().required(),
  })
).description('Schema for operations requiring a single cohort ID');

export const FindCohortsSchema = Joi.alternatives().try(
  Joi.object({
    query: Joi.object().optional().default({}),
    user: Joi.any().optional().description('The authenticated user'),
  }).unknown(true),
  Joi.object().unknown(true)
).description('Schema for fetching lists of cohorts');

export const InstructorOnlyEventsSchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any()
      .optional()
      .description('The authenticated user (must be Instructor or Admin)'),
    query: Joi.object().optional().default({}).description('Additional filters'),
  }),
  Joi.object().unknown(true)
).description('Schema for instructor-context cohort operations');
