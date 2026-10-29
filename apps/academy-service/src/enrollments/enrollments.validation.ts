import * as Joi from 'joi';

const createEnrollmentDtoSchema = Joi.object({
  courseId: Joi.number()
    .integer()
    .required()
    .description('The ID of the course to enroll in'),
  cohortId: Joi.number()
    .integer()
    .optional()
    .allow(null)
    .description('The specific cohort ID, if applicable'),
  userId: Joi.string()
    .optional()
    .description('The user ID to enroll (if authorized to enroll others)'),
  paymentGateway: Joi.string()
    .optional()
    .description('The payment gateway to use (CHAPA or STRIPE)'),
});

export const CreateEnrollmentSchema = Joi.alternatives().try(
  Joi.object({
    dto: createEnrollmentDtoSchema.required().description('Enrollment details'),
    user: Joi.any().optional().description('The authenticated user performing the enrollment'),
    clientIp: Joi.string().optional().allow(null),
    clientCountry: Joi.string().optional().allow(null),
  }),
  createEnrollmentDtoSchema
).description('Schema for creating a new course enrollment');

export const EnrollmentIdSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the enrollment'),
    user: Joi.any().optional().description('The authenticated user'),
  }),
  Joi.object({
    id: Joi.number().integer().required(),
  })
).description('Schema for operations requiring an enrollment ID');

export const FindAllEnrollmentsSchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any().optional().description('The authenticated user (typically Admin)'),
    query: Joi.object().optional().default({}).description('Pagination and filter queries'),
  }),
  Joi.object().unknown(true)
).description('Schema for listing all enrollments');

export const CohortIdEnrollmentSchema = Joi.alternatives().try(
  Joi.object({
    cohortId: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the cohort'),
    user: Joi.any().optional().description('The authenticated user'),
    query: Joi.object().optional().default({}).description('Additional filters'),
  }),
  Joi.object({
    cohortId: Joi.number().integer().required(),
    query: Joi.object().optional().default({}),
  })
).description('Schema for fetching enrollments by cohort');

export const UserIdEnrollmentSchema = Joi.alternatives().try(
  Joi.object({
    userId: Joi.string()
      .required()
      .description('The unique identifier of the user'),
    user: Joi.any().optional().description('The authenticated user'),
  }),
  Joi.object({
    userId: Joi.string().required(),
  })
).description('Schema for fetching enrollments by user ID');

export const CourseIdEnrollmentSchema = Joi.alternatives().try(
  Joi.object({
    courseId: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the course'),
    user: Joi.any().optional().description('The authenticated user'),
    query: Joi.object().optional().default({}).description('Additional filters'),
  }),
  Joi.object({
    courseId: Joi.number().integer().required(),
    query: Joi.object().optional().default({}),
  })
).description('Schema for fetching enrollments by course');

export const UserOnlySchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any().optional().description('The authenticated user context'),
  }),
  Joi.object().unknown(true)
).description('Schema for user-specific operations without additional payload');
