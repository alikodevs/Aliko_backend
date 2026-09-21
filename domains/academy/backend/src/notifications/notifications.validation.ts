import * as Joi from 'joi';

export const CreateNotificationSchema = Joi.object({
  dto: Joi.object({
    userId: Joi.string()
      .required()
      .description(
        'The unique identifier of the user to receive the notification',
      ),
    message: Joi.string()
      .required()
      .description('The notification message content'),
    type: Joi.string()
      .optional()
      .description(
        'The category of the notification (e.g., SYSTEM, COURSE_UPDATE)',
      ),
    meta: Joi.object()
      .unknown(true)
      .optional()
      .description('Optional structured details for this notification'),
  })
    .required()
    .description('Notification creation details'),
  user: Joi.any()
    .required()
    .description('The authenticated user performing the action'),
}).description('Schema for creating a new notification');

export const NotificationIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the notification'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for operations requiring a single notification ID');

export const UserOnlyNotificationSchema = Joi.object({
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for fetching notifications belonging to the user');

export const InternalProgressSchema = Joi.object({
  userId: Joi.string()
    .required()
    .description('The unique identifier of the student'),
  message: Joi.string().required().description('The progress-related message'),
}).description('Internal schema for system-generated progress notifications');

export const InternalInstructorNotifySchema = Joi.object({
  studentId: Joi.string()
    .required()
    .description('The ID of the student who completed the module'),
  courseId: Joi.number()
    .integer()
    .required()
    .description('The ID of the course'),
  moduleTitle: Joi.string()
    .required()
    .description('The title of the completed module'),
}).description(
  'Internal schema for notifying instructors about student progress',
);
