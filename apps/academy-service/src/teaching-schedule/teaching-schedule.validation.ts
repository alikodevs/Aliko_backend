import * as Joi from 'joi';

export const InstructorOnlyScheduleSchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any().optional().description('The authenticated user (Instructor or Admin)'),
  }).unknown(true),
  Joi.any(),
).description('Schema for instructor-context schedule operations');

export const CourseIdScheduleSchema = Joi.alternatives().try(
  Joi.object({
    courseId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }).unknown(true),
  Joi.number().integer(),
  Joi.any(),
).description('Schema for fetching schedules by course');

export const CreateTeachingScheduleSchema = Joi.alternatives().try(
  Joi.object({
    schedule: Joi.object({
      courseId: Joi.number().integer().required(),
      cohortId: Joi.number().integer().optional().allow(null),
      title: Joi.string().required(),
      description: Joi.string().optional().allow('', null),
      startTime: Joi.date().required(),
      endTime: Joi.date().required(),
      type: Joi.string()
        .valid('LIVE', 'RECORDING', 'Q_AND_A', 'OFFICE_HOURS', 'WORKSHOP')
        .required(),
      isRecurring: Joi.boolean().optional().default(false),
      recurrencePattern: Joi.string().optional().allow('', null),
    }).required(),
    user: Joi.any().optional(),
  }).unknown(true),
  Joi.object({
    courseId: Joi.number().integer().required(),
    cohortId: Joi.number().integer().optional().allow(null),
    title: Joi.string().required(),
    description: Joi.string().optional().allow('', null),
    startTime: Joi.date().required(),
    endTime: Joi.date().required(),
    type: Joi.string()
      .valid('LIVE', 'RECORDING', 'Q_AND_A', 'OFFICE_HOURS', 'WORKSHOP')
      .required(),
    isRecurring: Joi.boolean().optional().default(false),
    recurrencePattern: Joi.string().optional().allow('', null),
  }).unknown(true),
).description('Schema for creating a new teaching schedule entry');

export const UpdateTeachingScheduleSchema = Joi.alternatives().try(
  Joi.object({
    scheduleId: Joi.number().integer().optional(),
    updateData: Joi.object({
      title: Joi.string().optional(),
      description: Joi.string().optional().allow('', null),
      startTime: Joi.date().optional(),
      endTime: Joi.date().optional(),
      type: Joi.string()
        .valid('LIVE', 'RECORDING', 'Q_AND_A', 'OFFICE_HOURS', 'WORKSHOP')
        .optional(),
      isRecurring: Joi.boolean().optional(),
      recurrencePattern: Joi.string().optional().allow('', null),
      cohortId: Joi.number().integer().optional().allow(null),
    }).required(),
    user: Joi.any().optional(),
  }).unknown(true),
  Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional().allow('', null),
    startTime: Joi.date().optional(),
    endTime: Joi.date().optional(),
    type: Joi.string()
      .valid('LIVE', 'RECORDING', 'Q_AND_A', 'OFFICE_HOURS', 'WORKSHOP')
      .optional(),
    isRecurring: Joi.boolean().optional(),
    recurrencePattern: Joi.string().optional().allow('', null),
    cohortId: Joi.number().integer().optional().allow(null),
  }).unknown(true),
).description('Schema for updating an existing schedule entry');

export const ScheduleIdSchema = Joi.alternatives().try(
  Joi.object({
    scheduleId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }).unknown(true),
  Joi.number().integer(),
  Joi.any(),
).description('Schema for operations requiring a single schedule ID');
