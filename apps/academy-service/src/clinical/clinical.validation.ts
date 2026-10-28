import * as Joi from 'joi';

const createClinicalShiftDtoSchema = Joi.object({
  cohortId: Joi.number().integer().required(),
  facilityName: Joi.string().required().min(3).max(200),
  shiftDate: Joi.date().iso().required(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().required(),
  hoursCredited: Joi.number().positive().max(12).required(),
});

export const CreateClinicalShiftSchema = Joi.alternatives().try(
  Joi.object({
    dto: createClinicalShiftDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  createClinicalShiftDtoSchema
);

const recordClinicalAttendanceDtoSchema = Joi.object({
  shiftId: Joi.number().integer().required(),
  studentUserId: Joi.string().required(),
  hoursCompleted: Joi.number().min(0).max(12).required(),
  competencyNotes: Joi.string().optional().max(2000),
  passed: Joi.boolean().optional().default(true),
});

export const RecordClinicalAttendanceSchema = Joi.alternatives().try(
  Joi.object({
    dto: recordClinicalAttendanceDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  recordClinicalAttendanceDtoSchema
);

const updateClinicalAttendanceDtoSchema = Joi.object({
  hoursCompleted: Joi.number().min(0).max(12).optional(),
  competencyNotes: Joi.string().optional().max(2000),
  passed: Joi.boolean().optional(),
});

export const UpdateClinicalAttendanceSchema = Joi.alternatives().try(
  Joi.object({
    attendanceId: Joi.number().integer().optional(),
    dto: updateClinicalAttendanceDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  updateClinicalAttendanceDtoSchema
);

export const CohortClinicalSchema = Joi.alternatives().try(
  Joi.object({
    cohortId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    cohortId: Joi.number().integer().required(),
  })
);

export const StudentClinicalHoursSchema = Joi.alternatives().try(
  Joi.object({
    studentUserId: Joi.string().required(),
    cohortId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    studentUserId: Joi.string().required(),
    cohortId: Joi.number().integer().required(),
  })
);

export const ShiftIdSchema = Joi.alternatives().try(
  Joi.object({
    shiftId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    shiftId: Joi.number().integer().required(),
  })
);
