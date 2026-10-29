import * as Joi from 'joi';

const createNotificationDtoSchema = Joi.object({
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
});

export const CreateNotificationSchema = Joi.alternatives().try(
  Joi.object({
    dto: createNotificationDtoSchema.required().description('Notification creation details'),
    user: Joi.any().optional().description('The authenticated user performing the action'),
  }),
  createNotificationDtoSchema
).description('Schema for creating a new notification');

export const NotificationIdSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the notification'),
    user: Joi.any().optional().description('The authenticated user'),
  }),
  Joi.object({
    id: Joi.number().integer().required(),
  })
).description('Schema for operations requiring a single notification ID');

export const UserOnlyNotificationSchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any().optional().description('The authenticated user context'),
  }),
  Joi.object().unknown(true)
).description('Schema for fetching notifications belonging to the user');

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
