import * as Joi from 'joi';
import { CourseStatus } from '../generated/client';

export const CreateCourseSchema = Joi.object({
  dto: Joi.object({
    title: Joi.string().required().description('The title of the course'),
    shortDescription: Joi.string()
      .allow('', null)
      .description('A brief summary of the course'),
    longDescription: Joi.string()
      .allow('', null)
      .description('Detailed information about the course content'),
    thumbnail: Joi.string()
      .allow('', null)
      .description('URL to the course thumbnail image'),
    category: Joi.string()
      .allow('', null)
      .description('The category or domain the course belongs to'),
    status: Joi.string()
      .valid(...Object.values(CourseStatus))
      .required()
      .description('Current state of the course (e.g., DRAFT, PUBLISHED)'),
    skills: Joi.array()
      .items(Joi.string())
      .optional()
      .description('List of skills students will gain'),
    conceptsLearned: Joi.array()
      .items(Joi.string())
      .optional()
      .description('Key concepts covered in the course'),
    outcomes: Joi.array()
      .items(Joi.string())
      .optional()
      .description('Expected outcomes after completing the course'),
    estimatedTime: Joi.number()
      .integer()
      .optional()
      .description('Estimated duration to complete the course in hours'),
    targetLevel: Joi.string()
      .allow('', null)
      .description('Intended experience level (e.g., Beginner, Advanced)'),
    enrolledNum: Joi.number()
      .integer()
      .optional()
      .description('Number of students currently enrolled'),
    rating: Joi.number()
      .optional()
      .description('Average user rating of the course'),
    price: Joi.number()
      .allow(null, '')
      .optional()
      .description('Cost of the course in minor units (e.g., cents)'),
    priceInUsd: Joi.number()
      .allow(null, '')
      .optional()
      .description('Cost of the course in USD for Stripe payments'),
    prerequisites: Joi.array()
      .items(Joi.string())
      .optional()
      .description('List of courses or skills required before starting'),
    languages: Joi.array()
      .items(Joi.string())
      .optional()
      .description('Languages the course is available in'),
    createDefaultCohort: Joi.boolean()
      .default(false)
      .description('Whether to automatically create an initial cohort'),
  })
    .required()
    .description('Data Transfer Object for course creation'),
  user: Joi.any()
    .required()
    .description('The authenticated user performing the action'),
}).description('Schema for creating a new course');

export const UpdateCourseSchema = Joi.object({
  id: Joi.number()
    .required()
    .description('The unique identifier of the course to update'),
  dto: Joi.object({
    title: Joi.string()
      .optional()
      .description('The updated title of the course'),
    shortDescription: Joi.string()
      .allow('', null)
      .optional()
      .description('The updated short description'),
    longDescription: Joi.string()
      .allow('', null)
      .optional()
      .description('The updated long description'),
    thumbnail: Joi.string()
      .allow('', null)
      .optional()
      .description('The updated thumbnail URL'),
    category: Joi.string()
      .allow('', null)
      .optional()
      .description('The updated category'),
    status: Joi.string()
      .valid(...Object.values(CourseStatus))
      .optional()
      .description('The updated course status'),
    skills: Joi.array()
      .items(Joi.string())
      .optional()
      .description('The updated list of skills'),
    conceptsLearned: Joi.array()
      .items(Joi.string())
      .optional()
      .description('The updated list of concepts'),
    outcomes: Joi.array()
      .items(Joi.string())
      .optional()
      .description('The updated list of outcomes'),
    estimatedTime: Joi.number()
      .integer()
      .optional()
      .description('The updated estimated time'),
    targetLevel: Joi.string()
      .allow('', null)
      .optional()
      .description('The updated target level'),
    enrolledNum: Joi.number()
      .integer()
      .optional()
      .description('The updated enrollment count'),
    rating: Joi.number().optional().description('The updated rating'),
    price: Joi.number()
      .allow(null, '')
      .optional()
      .description('The updated price'),
    priceInUsd: Joi.number()
      .allow(null, '')
      .optional()
      .description('The updated price in USD'),
    prerequisites: Joi.array()
      .items(Joi.string())
      .optional()
      .description('The updated prerequisites'),
    languages: Joi.array()
      .items(Joi.string())
      .optional()
      .description('The updated list of languages'),
  })
    .required()
    .description('Data Transfer Object for updating an existing course'),
  user: Joi.any()
    .required()
    .description('The authenticated user performing the update'),
}).description('Schema for updating a course');

export const FindAllCoursesSchema = Joi.object({
  query: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .optional()
      .description('The page number for pagination'),
    pageSize: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .optional()
      .description('The number of items per page'),
    status: Joi.string()
      .valid(...Object.values(CourseStatus))
      .optional()
      .description('Filter by course status'),
    category: Joi.string().optional().description('Filter by category'),
    instructorId: Joi.string()
      .optional()
      .description('Filter by instructor ID'),
    targetLevel: Joi.string().optional().description('Filter by target level'),
    difficulty: Joi.string()
      .optional()
      .description('Filter by difficulty level'),
    q: Joi.string().allow('').optional().description('Search query string'),
  })
    .optional()
    .default({})
    .description('Query parameters for filtering results'),
  user: Joi.any().optional().description('The authenticated user'),
  clientIp: Joi.string().optional().allow('', null),
  clientCountry: Joi.string().optional().allow('', null),
}).description('Schema for fetching all courses with filters');

export const CourseIdSchema = Joi.object({
  id: Joi.number()
    .required()
    .description('The unique identifier of the course'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for operations requiring a single course ID');

export const FindOneCourseSchema = Joi.object({
  id: Joi.number()
    .required()
    .description('The unique identifier of the course'),
  user: Joi.any().optional().description('The authenticated user'),
  clientIp: Joi.string().optional().allow('', null),
  clientCountry: Joi.string().optional().allow('', null),
}).description('Schema for fetching a single course (publicly accessible)');

export const UpdateCourseStatusSchema = Joi.object({
  id: Joi.number()
    .required()
    .description('The unique identifier of the course'),
  status: Joi.string()
    .valid(...Object.values(CourseStatus))
    .required()
    .description('The new status to apply'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for updating course status exclusively');

export const AssignInstructorSchema = Joi.object({
  id: Joi.number()
    .required()
    .description('The unique identifier of the course'),
  instructorId: Joi.string()
    .required()
    .description('The firebase ID of the instructor to assign'),
  user: Joi.any()
    .required()
    .description('The authenticated user performing the assignment'),
}).description('Schema for assigning an instructor to a course');

export const RejectCourseSchema = Joi.object({
  id: Joi.number()
    .required()
    .description('The unique identifier of the course being rejected'),
  reason: Joi.string()
    .required()
    .description('The reason for rejecting the course approval'),
  user: Joi.any().required().description('The authenticated user (Admin)'),
}).description('Schema for course rejection by Admin');

export const InstructorOnlySchema = Joi.object({
  user: Joi.any()
    .required()
    .description('The authenticated user (must be Instructor or Admin)'),
}).description('Schema for instructor-context operations without payload');
