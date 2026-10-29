import * as Joi from 'joi';

export const UserOnlyProgressSchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any().optional().description('The authenticated user context'),
  }),
  Joi.object().unknown(true)
).description('Schema for fetching student-specific overall progress');

export const UserProgressSchema = Joi.alternatives().try(
  Joi.object({
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
      .optional()
      .description('The authenticated user performing the request'),
  }),
  Joi.object({
    targetUserId: Joi.string().required(),
    courseId: Joi.number().integer().required(),
  })
).description('Schema for fetching specific user progress in a course');

export const CourseAnalyticsSchema = Joi.alternatives().try(
  Joi.object({
    courseId: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the course'),
    user: Joi.any()
      .optional()
      .description('The authenticated user (typically Instructor or Admin)'),
  }),
  Joi.object({
    courseId: Joi.number().integer().required(),
  })
).description('Schema for fetching aggregate analytics for a course');

export const CompleteLessonSchema = Joi.alternatives().try(
  Joi.object({
    courseId: Joi.number()
      .integer()
      .required()
      .description('The ID of the course'),
    lessonId: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the lesson being completed'),
    user: Joi.any().optional().description('The student completing the lesson'),
  }),
  Joi.object({
    courseId: Joi.number().integer().required(),
    lessonId: Joi.number().integer().required(),
  })
).description('Schema for marking a lesson as completed');

const updateContentProgressFields = {
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
};

export const UpdateContentProgressSchema = Joi.alternatives().try(
  Joi.object({
    ...updateContentProgressFields,
    user: Joi.any().optional().description('The authenticated student'),
  }),
  Joi.object(updateContentProgressFields)
).description('Schema for updating progress on a specific content item');
