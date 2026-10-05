import * as Joi from 'joi';

export const UserOnlyProgressSchema = Joi.object({
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for fetching student-specific overall progress');

export const UserProgressSchema = Joi.object({
  targetUserId: Joi.string()
    .required()
    .description(
      'The unique identifier of the user whose progress is being viewed',
    ),
  courseId: Joi.number()
    .integer()
    .required()
    .description('The ID of the course'),
  user: Joi.any()
    .required()
    .description('The authenticated user performing the request'),
}).description('Schema for fetching specific user progress in a course');

export const CourseAnalyticsSchema = Joi.object({
  courseId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the course'),
  user: Joi.any()
    .required()
    .description('The authenticated user (typically Instructor or Admin)'),
}).description('Schema for fetching aggregate analytics for a course');

export const CompleteLessonSchema = Joi.object({
  courseId: Joi.number()
    .integer()
    .required()
    .description('The ID of the course'),
  lessonId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the lesson being completed'),
  user: Joi.any().required().description('The student completing the lesson'),
}).description('Schema for marking a lesson as completed');

export const UpdateContentProgressSchema = Joi.object({
  courseId: Joi.number()
    .integer()
    .required()
    .description('The ID of the course'),
  moduleId: Joi.number()
    .integer()
    .required()
    .description('The ID of the module'),
  lessonId: Joi.number()
    .integer()
    .required()
    .description('The ID of the lesson'),
  contentId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the content item'),
  status: Joi.string()
    .valid('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')
    .required()
    .description('The new progress status'),
  score: Joi.number()
    .optional()
    .allow(null)
    .description('Optional score earned for content completion'),
  user: Joi.any().required().description('The authenticated student'),
}).description('Schema for updating progress on a specific content item');
