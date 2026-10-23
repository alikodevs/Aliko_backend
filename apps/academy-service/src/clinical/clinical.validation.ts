import * as Joi from 'joi';

export const CreateClinicalShiftSchema = Joi.object({
  dto: Joi.object({
    cohortId: Joi.number().integer().required(),
    facilityName: Joi.string().required().min(3).max(200),
    shiftDate: Joi.date().iso().required(),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().required(),
    hoursCredited: Joi.number().positive().max(12).required(),
  }).required(),
  user: Joi.any().required(),
});

export const RecordClinicalAttendanceSchema = Joi.object({
  dto: Joi.object({
    shiftId: Joi.number().integer().required(),
    studentUserId: Joi.string().required(),
    hoursCompleted: Joi.number().min(0).max(12).required(),
    competencyNotes: Joi.string().optional().max(2000),
    passed: Joi.boolean().optional().default(true),
  }).required(),
  user: Joi.any().required(),
});

export const UpdateClinicalAttendanceSchema = Joi.object({
  attendanceId: Joi.number().integer().required(),
  dto: Joi.object({
    hoursCompleted: Joi.number().min(0).max(12).optional(),
    competencyNotes: Joi.string().optional().max(2000),
    passed: Joi.boolean().optional(),
  }).required(),
  user: Joi.any().required(),
});

export const CohortClinicalSchema = Joi.object({
  cohortId: Joi.number().integer().required(),
  user: Joi.any().required(),
});

export const StudentClinicalHoursSchema = Joi.object({
  studentUserId: Joi.string().required(),
  cohortId: Joi.number().integer().required(),
  user: Joi.any().required(),
});

export const ShiftIdSchema = Joi.object({
  shiftId: Joi.number().integer().required(),
  user: Joi.any().required(),
});
