import * as Joi from 'joi';

const attendanceReportQuerySchema = Joi.object({
  cohortId: Joi.number().integer().optional(),
  courseId: Joi.number().integer().optional(),
}).or('cohortId', 'courseId');

export const AttendanceReportQuerySchema = Joi.alternatives().try(
  Joi.object({
    query: attendanceReportQuerySchema.required(),
    user: Joi.any().optional(),
  }),
  attendanceReportQuerySchema,
);

const attendanceOverrideSchema = Joi.object({
  status: Joi.string()
    .valid(
      'PENDING_VERIFICATION',
      'VERIFIED_PRESENT',
      'NO_SHOW_AT_RISK',
      'ADMINISTRATIVE_DROP',
    )
    .required(),
  notes: Joi.string().allow('', null).optional(),
});

export const AttendanceOverrideSchema = Joi.alternatives().try(
  Joi.object({
    enrollmentId: Joi.number().integer().optional(),
    dto: attendanceOverrideSchema.required(),
    user: Joi.any().optional(),
  }),
  attendanceOverrideSchema,
);

export const CohortIdParamSchema = Joi.alternatives().try(
  Joi.object({
    cohortId: Joi.number().integer().required(),
    user: Joi.any().optional(),
    dto: Joi.any().optional(),
  }),
  Joi.object({
    cohortId: Joi.number().integer().required(),
  }),
);

export const CourseIdParamSchema = Joi.alternatives().try(
  Joi.object({
    courseId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    courseId: Joi.number().integer().required(),
  }),
);

