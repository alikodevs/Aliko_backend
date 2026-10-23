import * as Joi from 'joi';

export const CreateCoreSkillSchema = Joi.object({
  dto: Joi.object({
    skillNumber: Joi.string().required().pattern(/^SKILL-\d+$/),
    name: Joi.string().required().min(3).max(200),
    category: Joi.string().required(),
    steps: Joi.any().required(),
  }).required(),
  user: Joi.any().required(),
});

export const RecordSkillCheckoffSchema = Joi.object({
  dto: Joi.object({
    skillId: Joi.number().integer().required(),
    studentUserId: Joi.string().required(),
    cohortId: Joi.number().integer().required(),
    passed: Joi.boolean().required(),
    attempts: Joi.number().integer().min(1).optional().default(1),
    comments: Joi.string().optional().max(2000),
  }).required(),
  user: Joi.any().required(),
});

export const UpdateSkillCheckoffSchema = Joi.object({
  checkoffId: Joi.number().integer().required(),
  dto: Joi.object({
    passed: Joi.boolean().optional(),
    attempts: Joi.number().integer().min(1).optional(),
    comments: Joi.string().optional().max(2000),
  }).required(),
  user: Joi.any().required(),
});

export const SkillIdSchema = Joi.object({
  skillId: Joi.number().integer().required(),
  user: Joi.any().required(),
});

export const StudentSkillsSchema = Joi.object({
  studentUserId: Joi.string().required(),
  cohortId: Joi.number().integer().required(),
  user: Joi.any().required(),
});

export const ListSkillsSchema = Joi.object({
  user: Joi.any().required(),
});
