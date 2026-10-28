import * as Joi from 'joi';

const createCoreSkillDtoSchema = Joi.object({
  skillNumber: Joi.string().required(),
  name: Joi.string().required().min(3).max(200),
  category: Joi.string().required(),
  steps: Joi.any().required(),
});

export const CreateCoreSkillSchema = Joi.alternatives().try(
  Joi.object({
    dto: createCoreSkillDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  createCoreSkillDtoSchema
);

const recordSkillCheckoffDtoSchema = Joi.object({
  skillId: Joi.number().integer().required(),
  studentUserId: Joi.string().required(),
  cohortId: Joi.number().integer().required(),
  passed: Joi.boolean().required(),
  attempts: Joi.number().integer().min(1).optional().default(1),
  comments: Joi.string().optional().max(2000),
});

export const RecordSkillCheckoffSchema = Joi.alternatives().try(
  Joi.object({
    dto: recordSkillCheckoffDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  recordSkillCheckoffDtoSchema
);

const updateSkillCheckoffDtoSchema = Joi.object({
  passed: Joi.boolean().optional(),
  attempts: Joi.number().integer().min(1).optional(),
  comments: Joi.string().optional().max(2000),
});

export const UpdateSkillCheckoffSchema = Joi.alternatives().try(
  Joi.object({
    checkoffId: Joi.number().integer().optional(),
    dto: updateSkillCheckoffDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  updateSkillCheckoffDtoSchema
);

export const SkillIdSchema = Joi.alternatives().try(
  Joi.object({
    skillId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    skillId: Joi.number().integer().required(),
  })
);

export const StudentSkillsSchema = Joi.alternatives().try(
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

export const ListSkillsSchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any().optional(),
  }),
  Joi.any()
);
