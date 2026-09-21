import * as Joi from 'joi';

export const InstructorOnlyScheduleSchema = Joi.object({
  user: Joi.any()
    .required()
    .description('The authenticated user (Instructor or Admin)'),
}).description('Schema for instructor-context schedule operations');

export const CourseIdScheduleSchema = Joi.object({
  courseId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the course'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for fetching schedules by course');

export const CreateTeachingScheduleSchema = Joi.object({
  schedule: Joi.object({
    courseId: Joi.number()
      .integer()
      .required()
      .description('The ID of the course'),
    cohortId: Joi.number()
      .integer()
      .optional()
      .allow(null)
      .description('Optional associated cohort ID'),
    title: Joi.string().required().description('The title of the session'),
    description: Joi.string()
      .optional()
      .allow('')
      .allow(null)
      .description('Detailed description of the session'),
    startTime: Joi.date().required().description('Scheduled start time'),
    endTime: Joi.date().required().description('Scheduled end time'),
    type: Joi.string()
      .valid('LIVE', 'RECORDING', 'Q_AND_A', 'OFFICE_HOURS', 'WORKSHOP')
      .required()
      .description('The type of meeting'),
    isRecurring: Joi.boolean()
      .optional()
      .default(false)
      .description('Whether the schedule is recurring'),
    recurrencePattern: Joi.string()
      .optional()
      .allow('', null)
      .description('Recurrence pattern (if recurring)'),
  })
    .required()
    .description('Schedule creation details'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for creating a new teaching schedule entry');

export const UpdateTeachingScheduleSchema = Joi.object({
  scheduleId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the schedule to update'),
  updateData: Joi.object({
    title: Joi.string().optional().description('The updated title'),
    description: Joi.string()
      .optional()
      .allow('', null)
      .description('The updated description'),
    startTime: Joi.date().optional().description('The updated start time'),
    endTime: Joi.date().optional().description('The updated end time'),
    type: Joi.string()
      .valid('LIVE', 'RECORDING', 'Q_AND_A', 'OFFICE_HOURS', 'WORKSHOP')
      .optional()
      .description('The updated type'),
    isRecurring: Joi.boolean()
      .optional()
      .description('Whether the schedule is recurring'),
    recurrencePattern: Joi.string()
      .optional()
      .allow('', null)
      .description('The updated recurrence pattern'),
    cohortId: Joi.number()
      .integer()
      .optional()
      .allow(null)
      .description('The updated cohort ID'),
  })
    .required()
    .description('Schedule update details'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for updating an existing schedule entry');

export const ScheduleIdSchema = Joi.object({
  scheduleId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the schedule'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for operations requiring a single schedule ID');
