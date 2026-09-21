import * as Joi from 'joi';

export const CreateEnrollmentSchema = Joi.object({
  dto: Joi.object({
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
  })
    .required()
    .description('Enrollment details'),
  user: Joi.any()
    .required()
    .description('The authenticated user performing the enrollment'),
  clientIp: Joi.string()
    .optional()
    .allow(null)
    .description('Client IP address for geo-based payment routing'),
  clientCountry: Joi.string()
    .optional()
    .allow(null)
    .description('Client country code from CDN headers (e.g. cf-ipcountry)'),
}).description('Schema for creating a new course enrollment');

export const EnrollmentIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the enrollment'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for operations requiring an enrollment ID');

export const FindAllEnrollmentsSchema = Joi.object({
  user: Joi.any()
    .required()
    .description('The authenticated user (typically Admin)'),
  query: Joi.object()
    .optional()
    .default({})
    .description('Pagination and filter queries'),
}).description('Schema for listing all enrollments');

export const CohortIdEnrollmentSchema = Joi.object({
  cohortId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the cohort'),
  user: Joi.any().required().description('The authenticated user'),
  query: Joi.object().optional().default({}).description('Additional filters'),
}).description('Schema for fetching enrollments by cohort');

export const UserIdEnrollmentSchema = Joi.object({
  userId: Joi.string()
    .required()
    .description('The unique identifier of the user'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for fetching enrollments by user ID');

export const CourseIdEnrollmentSchema = Joi.object({
  courseId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the course'),
  user: Joi.any().required().description('The authenticated user'),
  query: Joi.object().optional().default({}).description('Additional filters'),
}).description('Schema for fetching enrollments by course');

export const UserOnlySchema = Joi.object({
  user: Joi.any().required().description('The authenticated user context'),
}).description(
  'Schema for user-specific operations without additional payload',
);
